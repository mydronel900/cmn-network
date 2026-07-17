/**
 * API Route: GET /api/network-status
 * Enhanced layout exposing P2P Mesh connectivity attributes to the frontend console.
 */

import fs from 'fs';
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

        let netParity = 0;
        if (typeof oracle.calculateParityIndex === 'function') netParity = oracle.calculateParityIndex();
        else if (oracle.currentParity) netParity = oracle.currentParity;

        let breakdown = { land: 0, energy: 0, commodities: 0 };
        if (oracle.registry) {
            breakdown = {
                land: oracle.registry.productiveLand?.valueUSD || 0,
                energy: oracle.registry.renewableEnergy?.valueUSD || 0,
                commodities: oracle.registry.vitalCommodities?.valueUSD || 0
            };
        }

        // Expose how many distinct secure public key bindings are currently synced
        const mappedIdentitiesCount = Object.keys(trustMesh.publicKeys || {}).length;

        return res.status(200).json({
            success: true,
            cmnParityUSD: netParity,
            assetBreakdown: breakdown,
            meshConnectivity: {
                activeSecuredNodes: mappedIdentitiesCount
            },
            ledger: {
                balances: trustMesh.balances || {},
                vouches: trustMesh.vouches || {},
                vouchers: trustMesh.vouchers || {},
                publicKeys: trustMesh.publicKeys || {}
            }
        });
    } catch (error) {
        return res.status(200).json({ success: false, error: error.message });
    }
}
