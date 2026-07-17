/**
 * API Route: POST /api/register-key
 * Binds a Node ID to a cryptographic public key in JSON Web Key (JWK) format.
 */

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
        try {
            body = JSON.parse(body);
        } catch(e) {
            return res.status(400).json({ success: false, error: 'Malformed JSON payload.' });
        }
    }

    const { nodeId, publicKeyJWK } = body || {};

    if (!nodeId || !publicKeyJWK) {
        return res.status(400).json({ success: false, error: 'Both nodeId and publicKeyJWK parameters are required.' });
    }

    const oracle = new RWAOracleNetwork();
    const trustMesh = new NexusTrustMesh();
    const clearing = new CMNClearingEngine(trustMesh);
    const storage = new CMNStorageManager();

    try {
        storage.rehydrate(trustMesh, oracle, clearing);

        // Safeguard: Initialize the container dynamically if parsing legacy files
        if (!trustMesh.publicKeys) {
            trustMesh.publicKeys = {};
        }

        // Trust-On-First-Use (TOFU) rule: If a node has registered a key, it's locked to that key!
        if (trustMesh.publicKeys[nodeId]) {
            return res.status(400).json({ 
                success: false, 
                error: `Identity Compromise Blocked: Node ID '${nodeId}' already has a registered cryptographic signature key.` 
            });
        }

        // Save public key mapping
        trustMesh.publicKeys[nodeId] = publicKeyJWK;

        // Automatically initialize their account ledger index if they're a brand new peer
        if (trustMesh.balances[nodeId] === undefined) {
            trustMesh.initializeAccount(nodeId, 0);
        }

        storage.persist(trustMesh, oracle, clearing);

        return res.status(200).json({
            success: true,
            message: `Identity verified. Cryptographic key bound to Node: ${nodeId}`
        });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}
