/**
 * CMN Development Utility: Key Purge Tool
 * Removes saved server keys to allow clean re-registration during testing loops.
 */

import RWAOracleNetwork from './api/cmn-oracle.js';
import NexusTrustMesh from './api/cmn-trust-mesh.js';
import CMNClearingEngine from './api/cmn-clearing.js';
import CMNStorageManager from './api/cmn-storage.js';

async function purge() {
    const oracle = new RWAOracleNetwork();
    const trustMesh = new NexusTrustMesh();
    const clearing = new CMNClearingEngine(trustMesh);
    const storage = new CMNStorageManager();

    try {
        storage.rehydrate(trustMesh, oracle, clearing);

        if (trustMesh.publicKeys && trustMesh.publicKeys['user_alice_node']) {
            delete trustMesh.publicKeys['user_alice_node'];
            storage.persist(trustMesh, oracle, clearing);
            console.log("🧹 [PURGE] Successfully removed 'user_alice_node' from the server public key cache.");
        } else {
            console.log("ℹ️ [PURGE] No server-side key found for 'user_alice_node'.");
        }
    } catch (err) {
        console.error("❌ Purge tool failure:", err.message);
    }
}

purge();
