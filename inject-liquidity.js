/**
 * CMN Development Utility: Liquidity Injector
 * Directly updates the local storage layer to seed nodes for simulation testing.
 */

import RWAOracleNetwork from './api/cmn-oracle.js';
import NexusTrustMesh from './api/cmn-trust-mesh.js';
import CMNClearingEngine from './api/cmn-clearing.js';
import CMNStorageManager from './api/cmn-storage.js';

async function inject() {
    const oracle = new RWAOracleNetwork();
    const trustMesh = new NexusTrustMesh();
    const clearing = new CMNClearingEngine(trustMesh);
    const storage = new CMNStorageManager();

    try {
        // 1. Rehydrate current database state
        storage.rehydrate(trustMesh, oracle, clearing);

        // 2. Provision test tokens to Alice
        trustMesh.balances['user_alice_node'] = 50.00;
        
        // 3. Establish a mutual credit limit buffer from user_storage_test to Alice
        if (!trustMesh.vouchers['user_storage_test']) {
            trustMesh.vouchers['user_storage_test'] = {};
        }
        trustMesh.vouchers['user_storage_test']['user_alice_node'] = 25.00;

        // 4. Save modifications back to disk
        storage.persist(trustMesh, oracle, clearing);

        console.log("⚡ [PROVISIONER] Successfully updated ledger states:");
        console.log("   ➔ user_alice_node Balance: 50.00 CMN");
        console.log("   ➔ user_storage_test ➔ Alice Trust Line: 25.00 CMN");
    } catch (err) {
        console.error("❌ Provisioner failed:", err.message);
    }
}

inject();
