import fs from 'fs';
import CMNP2PEngine from './api/cmn-p2p.js';
import CMNStorageManager from './api/cmn-storage.js';
import NexusTrustMesh from './api/cmn-trust-mesh.js';

async function runSignedSyncSimulation() {
    console.log("🧼 Cleaning old storage artifacts...");
    const dbLondon = 'data/cmn-ledger-london.json';
    const dbTokyo = 'data/cmn-ledger-tokyo.json';
    const keyLondon = 'data/keys_anchor_london_coop.json';
    const keyTokyo = 'data/keys_node_tokyo_mesh.json';

    if (fs.existsSync(dbLondon)) fs.unlinkSync(dbLondon);
    if (fs.existsSync(dbTokyo)) fs.unlinkSync(dbTokyo);
    if (fs.existsSync(keyLondon)) fs.unlinkSync(keyLondon);
    if (fs.existsSync(keyTokyo)) fs.unlinkSync(keyTokyo);

    // Initial setup (Pre-seed balances)
    const storageLondon = new CMNStorageManager(dbLondon);
    const storageTokyo = new CMNStorageManager(dbTokyo);

    console.log("\n📡 Phase 1: Creating Isolated Nodes & Generating Identities...");
    const nodeLondon = new CMNP2PEngine('anchor_london_coop', 9001, dbLondon);
    const nodeTokyo = new CMNP2PEngine('node_tokyo_mesh', 9002, dbTokyo);

    console.log("\n💸 Phase 2: Executing local trades while offline...");
    // London signs two offline transactions
    nodeLondon.createOfflineTransaction('node_tokyo_mesh', 150); // Tx #1 (We will hijack this)
    nodeLondon.createOfflineTransaction('node_tokyo_mesh', 75);  // Tx #2 (We will leave this untouched)
    
    // Tokyo signs one offline transaction
    nodeTokyo.createOfflineTransaction('anchor_london_coop', 50);

    // --- ADVERSARIAL ATTACK SIMULATION ---
    console.log("\n😈 Phase 2.5: A malicious actor accesses London's database and alters a transaction!");
    const rawLondon = fs.readFileSync(dbLondon, 'utf8');
    const dataLondon = JSON.parse(rawLondon);

    // Modify the ledger payload of the first transaction from 150 to 9000 credits
    const tamperedTx = dataLondon.pendingQueue[0];
    console.log(`⚠️  Original Tx Amount recorded in queue: ${tamperedTx.amount} credits`);
    tamperedTx.amount = 9000; // Altered in transit!
    console.log(`🔥 TAMPERED Tx Amount written to disk: ${tamperedTx.amount} credits`);

    fs.writeFileSync(dbLondon, JSON.stringify(dataLondon, null, 4), 'utf8');
    // -------------------------------------

    console.log("\n🔌 Phase 3: Nodes establish physical network contact. Running Handshake...");
    nodeLondon.startServer();
    nodeTokyo.startServer();

    console.log("🔗 Opening direct P2P link between Tokyo and London...");
    await nodeTokyo.connectToPeer('127.0.0.1', 9001);

    // Wait for the asynchronous sync, verify, and acknowledgement steps to finish over the wire
    await new Promise(r => setTimeout(r, 1200));

    console.log("\n📊 Phase 4: Verification of Ledger Protection");
    const meshLondonPost = new NexusTrustMesh();
    const meshTokyoPost = new NexusTrustMesh();

    storageLondon.rehydrate(meshLondonPost);
    storageTokyo.rehydrate(meshTokyoPost);

    console.log("\n✨ Final Verified Ledger State on Disk:");
    console.log(`🇬🇧 London Node balance: ${meshLondonPost.balances['anchor_london_coop']} (Expected: 825)`);
    console.log(`🇯🇵 Tokyo Node balance: ${meshTokyoPost.balances['node_tokyo_mesh']} (Expected: 575)`);
    console.log(`📦 London Unsent Queue: ${meshLondonPost.pendingQueue.length} (Expected: 1 - The tampered transaction cannot be cleared!)`);

    nodeLondon.stop();
    nodeTokyo.stop();
    console.log("\n🛑 Offline Sync Integration Test Finished.");
}

runSignedSyncSimulation();
