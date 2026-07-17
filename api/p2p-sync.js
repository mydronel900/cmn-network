/**
 * API Route: POST /api/p2p-sync
 * Handles inbound state delta reconciliation from remote mesh network peers.
 */

import RWAOracleNetwork from './cmn-oracle.js';
import NexusTrustMesh from './cmn-trust-mesh.js';
import CMNClearingEngine from './cmn-clearing.js';
import CMNStorageManager from './cmn-storage.js';

export default async function handler(req, res) {
    const oracle = new RWAOracleNetwork();
    const trustMesh = new NexusTrustMesh();
    const clearing = new CMNClearingEngine(trustMesh);
    const storage = new CMNStorageManager();

    try {
        storage.rehydrate(trustMesh, oracle, clearing);

        // GET Request: Remote peer wants our state vector
        if (req.method === 'GET') {
            return res.status(200).json({
                success: true,
                balances: trustMesh.balances,
                publicKeys: trustMesh.publicKeys || {},
                vouchers: trustMesh.vouchers || {},
                vouches: trustMesh.vouches || {}
            });
        }

        // POST Request: Merge state vector payload from remote peer
        if (req.method === 'POST') {
            let remoteState = req.body;
            if (typeof remoteState === 'string') remoteState = JSON.parse(remoteState);

            let updatesCommitted = false;

            // 1. Anti-Entropy Public Key Union Merge
            if (remoteState.publicKeys) {
                Object.keys(remoteState.publicKeys).forEach(nodeId => {
                    if (!trustMesh.publicKeys[nodeId]) {
                        trustMesh.publicKeys[nodeId] = remoteState.publicKeys[nodeId];
                        updatesCommitted = true;
                    }
                });
            }

            // 2. Anti-Entropy Balance Matrix Merge (Resolving conflicts using Max-Value state convergence)
            if (remoteState.balances) {
                Object.keys(remoteState.balances).forEach(nodeId => {
                    if (trustMesh.balances[nodeId] === undefined) {
                        trustMesh.balances[nodeId] = remoteState.balances[nodeId];
                        updatesCommitted = true;
                    } else if (remoteState.balances[nodeId] > trustMesh.balances[nodeId]) {
                        // Optimistic synchronization override if balance discrepancy favors positive credit clearing
                        trustMesh.balances[nodeId] = remoteState.balances[nodeId];
                        updatesCommitted = true;
                    }
                });
            }

            // 3. Persist states if structural drift was aligned
            if (updatesCommitted) {
                storage.persist(trustMesh, oracle, clearing);
            }

            return res.status(200).json({
                success: true,
                message: updatesCommitted ? 'Ledger state synchronized.' : 'States already perfectly aligned.'
            });
        }

        return res.status(405).json({ success: false, error: 'Method Not Allowed' });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}
