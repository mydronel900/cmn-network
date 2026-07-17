/**
 * CMN Core Engine Module: RWA Oracle Credit Enforcer
 * Dynamically scales mesh credit limits based on real-world asset health indices.
 */

import CMNStorageManager from './cmn-storage.js';
import NexusTrustMesh from './cmn-trust-mesh.js';
import RWAOracleNetwork from './cmn-oracle.js';
import CMNClearingEngine from './cmn-clearing.js';

export default class CMNOracleEnforcer {
    constructor(safetyBufferRatio = 0.8) {
        this.safetyBufferRatio = safetyBufferRatio; // Only allow credit lines up to 80% of asset value
        this.storage = new CMNStorageManager();
    }

    /**
     * Re-evaluates all open mesh credit lines against the live Oracle pricing index.
     * Compresses credit lines if asset valuations fall.
     */
    async enforceAssetParity() {
        const oracle = new RWAOracleNetwork();
        const trustMesh = new NexusTrustMesh();
        const clearing = new CMNClearingEngine(trustMesh);

        try {
            this.storage.rehydrate(trustMesh, oracle, clearing);

            // 1. Fetch live system value capacity from the Oracle
            const cmnParityUSD = oracle.calculateParityIndex();
            
            // Assume an aggregate network safety ceiling based on backing assets
            // Total system capacity value calculation mapping
            const maxSystemCreditCapacity = (oracle.assets.land + oracle.assets.energy + oracle.assets.commodities) * this.safetyBufferRatio;

            console.log(`\n⚖️ [ORACLE ENFORCER] Commencing global credit parity audit...`);
            console.log(`   ➔ Core RWA Index Token Parity: $${cmnParityUSD.toFixed(2)} USD`);
            console.log(`   ➔ Global Credit Safety Ceiling: ${maxSystemCreditCapacity.toFixed(2)} CMN`);

            // 2. Iterate through all open vouchers to ensure no node is over-extended
            let networkAltered = false;
            
            Object.keys(trustMesh.vouchers).forEach(sourceNode => {
                Object.keys(trustMesh.vouchers[sourceNode]).forEach(targetNode => {
                    const currentLimit = trustMesh.vouchers[sourceNode][targetNode];
                    
                    // If a single credit line exceeds 50% of total backing assets, compress it for systemic safety
                    const safetyCeilingPerLine = maxSystemCreditCapacity * 0.5;
                    
                    if (currentLimit > safetyCeilingPerLine) {
                        console.log(`⚠️ [COMPRESSION REQUIRED] Line [${sourceNode} ➔ ${targetNode}] is over-collateralized (${currentLimit} CMN).`);
                        trustMesh.vouchers[sourceNode][targetNode] = parseFloat(safetyCeilingPerLine.toFixed(2));
                        networkAltered = true;
                    }
                });
            });

            if (networkAltered) {
                this.storage.persist(trustMesh, oracle, clearing);
                console.log("🔒 [AUDIT COMPLETE] Systemic credit limits successfully compressed to match RWA limits.");
            } else {
                console.log("💚 [AUDIT COMPLETE] All credit lines within healthy physical asset limits.");
            }

            return {
                success: true,
                parityUSD: cmnParityUSD,
                systemCeiling: maxSystemCreditCapacity
            };

        } catch (err) {
            console.error("❌ [ENFORCER CRASH] Failed to audit system limits:", err.message);
            return { success: false, error: err.message };
        }
    }
}
