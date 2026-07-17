import RWAOracleNetwork from '../api/cmn-oracle.js';
import NexusTrustMesh from '../api/cmn-trust-mesh.js';
import CMNClearingEngine from '../api/cmn-clearing.js';
import CMNStorageManager from '../api/cmn-storage.js';

async function runMemoryDiagnostic() {
    console.log("==================================================");
    console.log("💾 RUNNING PERSISTENCE & MEMORY DIAGNOSTIC");
    console.log("==================================================");

    const oracle = new RWAOracleNetwork();
    const trustMesh = new NexusTrustMesh();
    const clearing = new CMNClearingEngine(trustMesh);
    const storage = new CMNStorageManager();

    // 1. Rehydrate whatever state is currently on the disk
    storage.rehydrate(trustMesh, oracle, clearing);

    const testUser = "user_storage_test";

    // 2. Branch processing logic to evaluate memory state
    if (trustMesh.balances[testUser] === undefined) {
        console.log("\n▶ [RUN 1 DETECTED]: Clean environment. Seeding persistent data...");
        
        // Setup initial network positions
        trustMesh.initializeAccount(testUser, 750);
        oracle.updateCommodityPrice("gold_feed", 2200);
        
        console.log(`✔ Seeded ${testUser} with a structural balance of: ${trustMesh.balances[testUser]} CMN.`);
        console.log(`✔ Logged Gold Spot Oracle Price at: $2200 USD.`);
        
        // Commit changes to disk
        storage.persist(trustMesh, oracle, clearing);
        console.log("\n👉 RUN 1 COMPLETE. Now run the script a SECOND time to verify persistence!");
    } else {
        console.log("\n▶ [RUN 2 DETECTED]: State found on disk! Analyzing memory survival...");
        
        // Assert values are identical to what was generated during Run 1
        const recoveredBalance = trustMesh.balances[testUser];
        const recoveredOraclePrice = oracle.registry.vitalCommodities.feeds["gold_feed"];

        console.log(`📊 Recovered Wallet Balance: ${recoveredBalance} CMN (Expected: 750 CMN)`);
        console.log(`📊 Recovered Oracle Feedback: $${recoveredOraclePrice} USD (Expected: $2200 USD)`);

        if (recoveredBalance === 750 && recoveredOraclePrice === 2200) {
            console.log("\n🎉 TEST SUCCESS: Memory fully integrated. System data survived process death.");
        } else {
            console.log("\n❌ TEST FAILED: State data anomaly detected.");
        }
    }
    console.log("==================================================\n");
}

runMemoryDiagnostic().catch(console.error);
