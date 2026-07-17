/**
 * CMN Simulation Loop: Fiat Gateway On-Ramp Integration Test
 */

import CMNAnchorGateway from './api/cmn-anchor.js';

async function runSimulation() {
    // Instantiate a trusted regional anchor gateway node
    const regionalAnchor = new CMNAnchorGateway('anchor_london_coop', 'USD');

    console.log("🚀 Initializing simulated Bank Wire Transfer confirmation webhook...");

    // Simulate Alice depositing $75.00 USD at the anchor
    const result = await regionalAnchor.processFiatDeposit(
        'user_alice_node', // User's hardware Passkey ID
        75.00,              // Fiat Amount deposited ($ USD)
        'TXN_BANK_WIRE_99818A' // External banking tracking token reference ID
    );

    console.log("\n📊 Execution Summary Data Return Mapping:");
    console.log(JSON.stringify(result, null, 2));
}

runSimulation();
