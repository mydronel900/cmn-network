/**
 * CMN Simulation Loop: Isolated Multi-Node P2P Gossip & Sync Integration Test
 */

import fs from 'fs';
import path from 'path';
import CMNP2PEngine from './api/cmn-p2p.js';
import CMNStorageManager from './api/cmn-storage.js';
import NexusTrustMesh from './api/cmn-trust-mesh.js';
import CMNWebOfTrustFixed from './api/cmn-wot.js';

async function runMeshSyncTest() {
    console.log("🧼 Cleaning up old simulation databases for fresh state isolation...");
    
    // Explicitly define and delete past files so we prove synchronization occurred exclusively over network sockets
    const dbPathLondon = 'data/cmn-ledger-london.json';
    const dbPathTokyo = 'data/cmn-ledger-tokyo.json';

    if (fs.existsSync(dbPathLondon)) fs.unlinkSync(dbPathLondon);
    if (fs.existsSync(dbPathTokyo)) fs.unlinkSync(dbPathTokyo);

    console.log("🚀 Booting up isolated local decentralized P2P Mesh peers...");

    // 1. Instantiate the nodes on isolated databases
    const nodeLondon = new CMNP2PEngine('node_london_anchor', 9001, dbPathLondon);
    const nodeTokyo = new CMNP2PEngine('node_tokyo_mesh', 9002, dbPathTokyo);

    nodeLondon.startServer();
    nodeTokyo.startServer();

    // 2. Open up the connection pathway
    await nodeTokyo.connectToPeer('127.0.0.1', 9001);

    // Give TCP handshakes a moment to finish
    await new Promise(r => setTimeout(r, 600));

    console.log("\n⚡ Step 1: Performing state modification ONLY on London's database...");
    
    // London vouches for a brand new pioneer
    const londonWot = new CMNWebOfTrustFixed(2, 3, dbPathLondon);
    await londonWot.recordVouch('anchor_london_coop', 'user_p2p_pioneer');

    console.log("\n📡 Step 2: Triggering London's active gossip broadcast...");
    nodeLondon.gossipCurrentState();

    // Give TCP transmission & filesystem writes 600ms to resolve
    await new Promise(r => setTimeout(r, 600));

    console.log("\n📊 Step 3: Verification of Independent State Synchronization...");
    
    // Pull the data directly out of Tokyo's physically separate database file to verify sync
    const tokyoTrustMesh = new NexusTrustMesh();
    const tokyoStorage = new CMNStorageManager(dbPathTokyo);
    tokyoStorage.rehydrate(tokyoTrustMesh);

    console.log("\n🔍 Dynamic state inside Node Tokyo's isolated database:");
    console.log(JSON.stringify(tokyoTrustMesh.wotRegistry || {}, null, 2));

    const wasSyncSuccessful = tokyoTrustMesh.wotRegistry && tokyoTrustMesh.wotRegistry['user_p2p_pioneer'];
    if (wasSyncSuccessful) {
        console.log("\n🎉 TEST PASSED: State successfully replicated across physically isolated files purely via P2P TCP gossip sockets!");
    } else {
        console.log("\n❌ TEST FAILED: Tokyo did not receive the synchronized state.");
    }

    // Gracefully spin down network listeners
    nodeLondon.stop();
    nodeTokyo.stop();
    console.log("\n🛑 P2P Mesh Simulation Terminated.");
}

runMeshSyncTest();
