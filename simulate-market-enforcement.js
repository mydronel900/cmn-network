/**
 * CMN Simulation Loop: Real-World Asset Oracle Credit Enforcement Test
 */

import CMNOracleEnforcer from './api/cmn-rwa-enforcer.js';
import RWAOracleNetwork from './api/cmn-oracle.js';
import CMNStorageManager from './api/cmn-storage.js';
import NexusTrustMesh from './api/cmn-trust-mesh.js';
import CMNClearingEngine from './api/cmn-clearing.js';

async function runMarketAudit() {
    const enforcer = new CMNOracleEnforcer(0.8);
    const storage = new CMNStorageManager();
    const oracle = new RWAOracleNetwork();
    const trustMesh = new NexusTrustMesh();
    const clearing = new CMNClearingEngine(trustMesh);

    console.log("📊 [SCENARIO 1] Auditing system under baseline market configuration...");
    await enforcer.enforceAssetParity();

    console.log("\n📉 [SCENARIO 2] Simulating severe climate/market shock event...");
    // Manually force an asset devaluation event (e.g., regional solar array goes offline entirely)
    storage.rehydrate(trustMesh, oracle, clearing);
    
    console.log("💥 CRITICAL: Regional Renewable Energy infrastructure reports major outage. Value drops 30 ➔ 5 USD.");
    oracle.assets.energy = 5.00; 
    
    // Save the damaged oracle market conditions down to database
    storage.persist(trustMesh, oracle, clearing);

    // Trigger the enforcer to see it protect the network from financial exposure
    console.log("\n🔄 Re-running Oracle enforcement audit under crash conditions...");
    const auditReport = await enforcer.enforceAssetParity();
    
    console.log("\n📋 Final Enforcer Metrics:", JSON.stringify(auditReport, null, 2));
}

runMarketAudit();
