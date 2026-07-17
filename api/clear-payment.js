/**
 * API Route: POST /api/clear-payment
 * Multi-hop zero-trust cryptographic settlement validation endpoint.
 */

import crypto from 'crypto';
import RWAOracleNetwork from './cmn-oracle.js';
import NexusTrustMesh from './cmn-trust-mesh.js';
import CMNClearingEngine from './cmn-clearing.js';
import CMNStorageManager from './cmn-storage.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method Not Allowed' });
    }

    let body = req.body;
    if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch (e) {
            return res.status(400).json({ success: false, error: 'Malformed JSON payload.' });
        }
    }

    const { sender, receiver, amount, signature, timestamp } = body || {};

    if (!sender || !receiver || !amount || parseFloat(amount) <= 0 || !signature || !timestamp) {
        return res.status(400).json({ success: false, error: 'Incomplete transaction parameters.' });
    }

    const oracle = new RWAOracleNetwork();
    const trustMesh = new NexusTrustMesh();
    const clearing = new CMNClearingEngine(trustMesh);
    const storage = new CMNStorageManager();

    try {
        storage.rehydrate(trustMesh, oracle, clearing);

        const publicKeyJWK = trustMesh.publicKeys?.[sender];
        if (!publicKeyJWK) {
            return res.status(400).json({
                success: false,
                error: `Clearance aborted. Sender '${sender}' has no registered key.`
            });
        }

        const elapsed = Math.abs(Date.now() - parseInt(timestamp));
        if (isNaN(elapsed) || elapsed > 300000) {
            return res.status(400).json({ success: false, error: 'Security Reject: Transaction expired.' });
        }

        const publicKey = crypto.createPublicKey({ key: publicKeyJWK, format: 'jwk' });
        const normalizedAmountString = parseFloat(amount).toFixed(2);
        const messageString = `${sender}:${receiver}:${normalizedAmountString}:${timestamp}`;
        
        const isVerified = crypto.verify(
            'SHA256',
            Buffer.from(messageString),
            { key: publicKey, dsaEncoding: 'ieee-p1363' },
            Buffer.from(signature, 'hex')
        );

        if (!isVerified) {
            return res.status(401).json({
                success: false,
                error: 'Identity Tampering Detected: Cryptographic signature mismatch.'
            });
        }

        // Execute multi-hop routing allocation pass
        const receipt = clearing.clearPayment(sender, receiver, parseFloat(amount));
        storage.persist(trustMesh, oracle, clearing);

        return res.status(200).json({
            success: true,
            receiptId: receipt.receiptId,
            pathUsed: receipt.pathUsed,
            senderFinalBalance: receipt.senderFinalBalance,
            receiverFinalBalance: receipt.receiverFinalBalance
        });
    } catch (error) {
        return res.status(400).json({ success: false, error: error.message });
    }
}
