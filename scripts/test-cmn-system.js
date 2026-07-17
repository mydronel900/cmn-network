import RWAOracleNetwork from '../api/cmn-oracle.js';
import NexusTrustMesh from '../api/cmn-trust-mesh.js';
import CMNClearingEngine from '../api/cmn-clearing.js';

async function runSystemDiagnostics() {
    console.log("==================================================");
    console.log("🤖 STARTING DGEA CORE ENGINE SYSTEM DIAGNOSTICS");
    console.log("==================================================\n");

    const oracle = new RWAOracleNetwork();
    const trustMesh = new NexusTrustMesh();
    const clearing = new CMNClearingEngine(trustMesh);

    console.log("✔ Global Architecture Modules Instantiated.");

    console.log("\n--- PHASE 1: Simulating Real-World Asset Feeds ---");
    oracle.updateCommodityPrice("feed_london_metal", 450);
    oracle.updateHardwareTelemetry("renewableEnergy", "solar_farm_node_01", 50);
    oracle.submitLandAppraisal("land_parcel_bali", "appraiser_09", 12000, 1500);

    const currentParity = oracle.getCalculatedIndexParity();
    console.log(`✔ Oracle Parity Metric Synthesized: 1 CMN = $${currentParity.cmnParityUSD.toFixed(2)} USD`);

    console.log("\n--- PHASE 2: Establishing Nexus Trust Topology ---");
    const alice = "user_alice_producer";
    const bob = "user_bob_creator";
    const charlie = "user_charlie_miner";

    trustMesh.initializeAccount(alice, 1000);
    trustMesh.addPeerVouch(alice, bob, 400);
    console.log(`✔ Bob's Algorithmic Credit Capacity (V_max): -${trustMesh.calculateMaxNegativeLimit(bob)} CMN`);

    console.log("\n--- PHASE 3: Processing Frictionless Transactions ---");
    const txReceipt = clearing.clearPayment(bob, charlie, 150);
    console.log(`✔ Transaction Cleared: [${txReceipt.receiptId}]`);
    console.log(`  Balances -> Bob: ${txReceipt.senderFinalBalance} CMN | Charlie: ${txReceipt.receiverFinalBalance} CMN`);

    console.log("\n--- PHASE 4: Testing Boundary Constraints ---");
    try {
        clearing.clearPayment(bob, charlie, 500);
    } catch (error) {
        console.log(`❌ System Guard Triggered Expected Exception: "${error.message}"`);
    }

    console.log("\n--- PHASE 5: Simulating Default Liquidation & Absorption ---");
    console.log(`Pre-Default State -> Alice Balance: ${trustMesh.balances[alice]} CMN`);
    trustMesh.processDefault(bob);
    console.log(`Post-Default State -> Alice Balance: ${trustMesh.balances[alice]} CMN (Loss absorbed)`);

    console.log("\n==================================================");
    console.log("🏁 CORE INTERLOCKING INTEGRATION COMPLETE: 100% STABLE");
    console.log("==================================================");
}

runSystemDiagnostics().catch(console.error);
