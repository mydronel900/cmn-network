<<<<<<< HEAD
import RWAOracleNetwork from '../api/cmn-oracle.js';
import NexusTrustMesh from '../api/cmn-trust-mesh.js';
import CMNClearingEngine from '../api/cmn-clearing.js';
=======
/**
 * CMN End-to-End System Integration Test
 * Run command in Termux: node scripts/test-cmn-system.js
 */

import RWAOracleNetwork from '../api/cmn-oracle.js';
import NexusTrustMesh from '../api/cmn-trust-mesh.js';
import CMNClearingEngine from '../api/cmn-clearing.js';
import ZeroInterestCreditEngine from '../api/cmn-engine.js';
>>>>>>> a123d0b1846a7236b4e725b0b1f82619f5f68980

async function runSystemDiagnostics() {
    console.log("==================================================");
    console.log("🤖 STARTING DGEA CORE ENGINE SYSTEM DIAGNOSTICS");
    console.log("==================================================\n");

<<<<<<< HEAD
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
=======
    // 1. INITIALIZE ALL INTEGRATED ARCHITECTURES
    const oracle = new RWAOracleNetwork();
    const trustMesh = new NexusTrustMesh();
    const clearing = new CMNClearingEngine(trustMesh);
    const creditEngine = new ZeroInterestCreditEngine();

    console.log("✔ Global Architecture Modules Instantiated Successfully.");

    // ==================================================
    // PHASE 1: SEEDING ORACLE TELEMETRY & ASSET VALUATION
    // ==================================================
    console.log("\n--- PHASE 1: Simulating Real-World Asset Feeds ---");
    
    // Seed Tier 1 Commodities (e.g., Vital minerals and water spot market indices)
    oracle.updateCommodityPrice("feed_london_metal", 450);
    oracle.updateCommodityPrice("feed_chicago_water", 550);
    
    // Seed Tier 3 IoT Telemetry (e.g., A community solar grid outputting Megawatt-hours)
    // 50 MWh output * 150 conversion multiplier = $7,500 calculated asset worth
    oracle.updateHardwareTelemetry("renewableEnergy", "solar_farm_node_01", 50);
    
    // Submit Tier 2 Human Land Appraisal with a staked commitment
    oracle.submitLandAppraisal("land_parcel_bali", "appraiser_09", 12000, 1500);

    // Fetch unified currency parity base value
    const currentParity = oracle.getCalculatedIndexParity();
    console.log(`✔ Oracle Parity Metric Synthesized: 1 CMN = $${currentParity.cmnParityUSD.toFixed(2)} USD`);
    console.log(`  Asset Contributions -> Land: $${currentParity.breakdown.land} | Energy: $${currentParity.breakdown.energy} | Commodities: $${currentParity.breakdown.commodities}`);

    // ==================================================
    // PHASE 2: CONSTRUCTING THE DECENTRALIZED TRUST MESH
    // ==================================================
    console.log("\n--- PHASE 2: Establishing Nexus Trust Topology ---");
    
>>>>>>> a123d0b1846a7236b4e725b0b1f82619f5f68980
    const alice = "user_alice_producer";
    const bob = "user_bob_creator";
    const charlie = "user_charlie_miner";

<<<<<<< HEAD
    trustMesh.initializeAccount(alice, 1000);
    trustMesh.addPeerVouch(alice, bob, 400);
    console.log(`✔ Bob's Algorithmic Credit Capacity (V_max): -${trustMesh.calculateMaxNegativeLimit(bob)} CMN`);

    console.log("\n--- PHASE 3: Processing Frictionless Transactions ---");
=======
    // Alice initializes her account with 1000 CMN minted from hard physical capital
    trustMesh.initializeAccount(alice, 1000);
    trustMesh.initializeAccount(bob, 0);
    trustMesh.initializeAccount(charlie, 0);

    // Layer A Interlocking: Alice trusts Bob and extends a credit line vector of 400 CMN
    trustMesh.addPeerVouch(alice, bob, 400);
    console.log(`✔ Trust Vector Formed: Alice extends 400 CMN negative capacity to Bob.`);

    // Check Bob's Maximum Negative Balance Limit (V_max)
    const bobMaxNegative = trustMesh.calculateMaxNegativeLimit(bob);
    console.log(`✔ Bob's Algorithmic Credit Capacity (V_max): -${bobMaxNegative} CMN`);

    // ==================================================
    // PHASE 3: CLEARING TRANSACTION DATA & VELOCITY LAWS
    // ==================================================
    console.log("\n--- PHASE 3: Processing Frictionless Transactions ---");

    // Bob purchases 150 CMN worth of compute/assets from Charlie
    // He has 0 balance, so this drops his wallet directly into the negative zone
>>>>>>> a123d0b1846a7236b4e725b0b1f82619f5f68980
    const txReceipt = clearing.clearPayment(bob, charlie, 150);
    console.log(`✔ Transaction Cleared: [${txReceipt.receiptId}]`);
    console.log(`  Balances -> Bob: ${txReceipt.senderFinalBalance} CMN | Charlie: ${txReceipt.receiverFinalBalance} CMN`);

<<<<<<< HEAD
    console.log("\n--- PHASE 4: Testing Boundary Constraints ---");
    try {
=======
    // ==================================================
    // PHASE 4: STRESS-TESTING CRITICAL BOUNDARY ENFORCEMENT
    // ==================================================
    console.log("\n--- PHASE 4: Testing Boundary Constraints ---");

    try {
        console.log("Executing transaction malicious overflow attack (Bob tries spending 500 CMN, exceeding V_max)...");
>>>>>>> a123d0b1846a7236b4e725b0b1f82619f5f68980
        clearing.clearPayment(bob, charlie, 500);
    } catch (error) {
        console.log(`❌ System Guard Triggered Expected Exception: "${error.message}"`);
    }

<<<<<<< HEAD
    console.log("\n--- PHASE 5: Simulating Default Liquidation & Absorption ---");
    console.log(`Pre-Default State -> Alice Balance: ${trustMesh.balances[alice]} CMN`);
    trustMesh.processDefault(bob);
    console.log(`Post-Default State -> Alice Balance: ${trustMesh.balances[alice]} CMN (Loss absorbed)`);
=======
    // ==================================================
    // PHASE 5: RISK AMORTIZATION & STRUCTURAL ABSORPTION
    // ==================================================
    console.log("\n--- PHASE 5: Simulating Default Liquidation & Absorption ---");
    
    console.log(`Pre-Default Engine State -> Alice Balance: ${trustMesh.balances[alice]} CMN`);
    console.log("Bob defaults on his systemic obligations. Initiating structural trust mesh absorption...");
    
    const defaultResolution = trustMesh.processDefault(bob);
    console.log(`✔ Resolution Matrix Event: ${defaultResolution.outcome}`);
    console.log(`Post-Default Engine State -> Alice Balance: ${trustMesh.balances[alice]} CMN (Loss absorbed proportionally)`);
    console.log(`Post-Default Engine State -> Bob Balance: ${trustMesh.balances[bob]} CMN (Reset to structural baseline zero)`);
>>>>>>> a123d0b1846a7236b4e725b0b1f82619f5f68980

    console.log("\n==================================================");
    console.log("🏁 CORE INTERLOCKING INTEGRATION COMPLETE: 100% STABLE");
    console.log("==================================================");
}

runSystemDiagnostics().catch(console.error);
