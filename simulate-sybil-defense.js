/**
 * CMN Simulation Loop: Web of Trust Identity Attestation Test
 */

import CMNWebOfTrust from './api/cmn-wot.js';
import NexusTrustMesh from './api/cmn-trust-mesh.js';
import CMNStorageManager from './api/cmn-storage.js';
import RWAOracleNetwork from './api/cmn-oracle.js';
import CMNClearingEngine from './api/cmn-clearing.js';

async function runIdentityTest() {
    const wot = new CMNWebOfTrust(2); // Require 2 independent vouches
    const storage = new CMNStorageManager();
    
    const oracle = new RWAOracleNetwork();
    const trustMesh = new NexusTrustMesh();
    const clearing = new CMNClearingEngine(trustMesh);
    
    // Rehydrate using the complete state layout
    storage.rehydrate(trustMesh, oracle, clearing);

    console.log("🛡️ [TEST INITIALIZATION] Simulating network exposure check on unverified user...");
    const untrustedNode = "user_evil_bot";

    // 1. Evaluate safety profile of the suspicious node
    let securityReport = wot.validateNodeIntegrity(untrustedNode, trustMesh);
    console.log(`\n🚨 Initial Status for [${untrustedNode}]:`, JSON.stringify(securityReport, null, 2));

    console.log("\n⚡ Simulating community verification cascade...");
    
    // 2. Existing nodes vouch for the user
    await wot.recordVouch('anchor_london_coop', untrustedNode);
    await wot.recordVouch('user_alice_node', untrustedNode);

    // 3. Re-fetch fresh ledger states from storage
    storage.rehydrate(trustMesh, oracle, clearing);

    // 4. Re-evaluate integrity status
    securityReport = wot.validateNodeIntegrity(untrustedNode, trustMesh);
    console.log(`\n✅ Upgraded Status for [${untrustedNode}]:`, JSON.stringify(securityReport, null, 2));
}

runIdentityTest();
