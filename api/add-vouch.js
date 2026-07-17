/**
 * API Route: POST /api/add-vouch
 * Extends credit lines and updates peer-to-peer V_max trust boundaries.
 */

import RWAOracleNetwork from './cmn-oracle.js';
import NexusTrustMesh from './cmn-trust-mesh.js';
import CMNClearingEngine from './cmn-clearing.js';
import CMNStorageManager from './cmn-storage.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method Not Allowed' });
    }
    
    // Dynamic text-to-object parsing safety net
    let body = req.body;
    if (typeof body === 'string') {
        try { 
            body = JSON.parse(body); 
        } catch(e) { 
            return res.status(400).json({ success: false, error: 'Malformed JSON payload.' }); 
        }
    }

    const { voucher, vauchee, amount } = body || {};
    
    // Strict input validation checks
    if (!voucher || !vauchee || !amount || parseFloat(amount) <= 0) {
        return res.status(400).json({ 
            success: false, 
            error: 'Invalid validation attributes. Voucher ID, Vauchee ID, and a positive credit amount are required.' 
        });
    }

    const oracle = new RWAOracleNetwork();
    const trustMesh = new NexusTrustMesh();
    const clearing = new CMNClearingEngine(trustMesh);
    const storage = new CMNStorageManager();

    try {
        // 1. Rehydrate current data state from disk
        storage.rehydrate(trustMesh, oracle, clearing);
        
        // 2. Map the credit vector into the live trust topology
        const result = trustMesh.addPeerVouch(voucher, vauchee, parseFloat(amount));
        
        // 3. Persist the updated state delta back to your JSON file
        storage.persist(trustMesh, oracle, clearing);
        
        return res.status(200).json({ 
            success: true, 
            message: 'Trust boundary successfully mapped.',
            ...result 
        });
    } catch (error) {
        return res.status(400).json({ 
            success: false, 
            error: error.message 
        });
    }
}
