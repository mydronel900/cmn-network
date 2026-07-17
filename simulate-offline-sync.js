import fs from 'fs';
import CMNP2PEngine from './api/cmn-p2p.js';
import CMNStorageManager from './api/cmn-storage.js';
import NexusTrustMesh from './api/cmn-trust-mesh.js';

async function runOfflineSyncSimulation() {
    console.log("🧼 Cleaning old simulation databases...");
    const dbLondon = 'data/cmn-ledger-london.json';
    const dbTokyo = 'data/cmn-ledger-tokyo.json';

    if (fs.existsSync(dbLondon)) fs.unlinkSync(dbLondon);
    if (fs.existsSync(dbTokyo)) fs.unlinkSync(dbTokyo);

    // Initial setup (Pre-seed balances so nodes can transact offline)
    const storageLondon = new CMNStorageManager(dbLondon);
    const storageTokyo = new CMNStorageManager(dbTokyo);

    console.log("\n📡 Phase 1: Nodes exist in total isolation (No TCP Socket Connections).");
    const nodeLondon = new CMNP2PEngine('anchor_london_coop', 9001, dbLondon);
    const nodeTokyo = new CMNP2PEngine('node_tokyo_mesh', 9002, dbTokyo);

    // Create dynamic local trade movements on London and Tokyo without internet or mesh connection
    console.log("\n💸 Phase 2: Executing local trades while offline...");
    nodeLondon.createOfflineTransaction('node_tokyo_mesh', 150);
    nodeLondon.createOfflineTransaction('node_tokyo_mesh', 75);
    nodeTokyo.createOfflineTransaction('anchor_london_coop', 50);

    // Verify storage metrics BEFORE they find each other
    const meshLondonPre = new NexusTrustMesh();
    storageLondon.rehydrate(meshLondonPre);
    console.log(`\n📊 London Local Queue Status: ${meshLondonPre.pendingQueue.length} unsynced transactions.`);
    console.log(`📊 London Local Balance (Optimistic): ${meshLondonPre.balances['anchor_london_coop']} credits.`);

    console.log("\n🔌 Phase 3: Nodes establish physical network contact. Spinning up listeners...");
    nodeLondon.startServer();
    nodeTokyo.startServer();

    console.log("🔗 Opening direct P2P link between Tokyo and London...");
    await nodeTokyo.connectToPeer('127.0.0.1', 9001);

    // Wait for the sync and acknowledgement frames to complete over TCP
    await new Promise(r => setTimeout(r, 1000));

    console.log("\n📊 Phase 4: Final State Verification Post-Reconciliation");
    const meshLondonPost = new NexusTrustMesh();
    const meshTokyoPost = new NexusTrustMesh();

    storageLondon.rehydrate(meshLondonPost);
    storageTokyo.rehydrate(meshTokyoPost);

    console.log("\n✨ Final Verified Balances on Disk:");
    console.log(`🇬🇧 London Node balance: ${meshLondonPost.balances['anchor_london_coop']} (Expected: 825)`);
    console.log(`🇯🇵 Tokyo Node balance: ${meshTokyoPost.balances['node_tokyo_mesh']} (Expected: 675)`);
    console.log(`📦 London Pending Queue Length: ${meshLondonPost.pendingQueue.length} (Expected: 0)`);
    console.log(`📦 Tokyo Pending Queue Length: ${meshTokyoPost.pendingQueue.length} (Expected: 0)`);

    nodeLondon.stop();
    nodeTokyo.stop();
    console.log("\n🛑 Offline Sync Integration Test Finished.");
}

runOfflineSyncSimulation();
