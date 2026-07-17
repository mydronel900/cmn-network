import fs from 'fs';
import CMNP2PEngine from './api/cmn-p2p.js';
import CMNStorageManager from './api/cmn-storage.js';
import NexusTrustMesh from './api/cmn-trust-mesh.js';

async function runDoubleSpendSimulation() {
    console.log("🧼 Preparing test database files...");
    const dbLondon = 'data/cmn-ledger-london.json';
    const dbTokyo = 'data/cmn-ledger-tokyo.json';
    const dbSydney = 'data/cmn-ledger-sydney.json';

    if (fs.existsSync(dbLondon)) fs.unlinkSync(dbLondon);
    if (fs.existsSync(dbTokyo)) fs.unlinkSync(dbTokyo);
    if (fs.existsSync(dbSydney)) fs.unlinkSync(dbSydney);

    // Seed balances (London starts with 100, others with 0)
    const seedDB = (path, balanceMap) => {
        const manager = new CMNStorageManager(path);
        const mesh = new NexusTrustMesh();
        mesh.balances = balanceMap;
        manager.persist(mesh, null, null);
    };

    seedDB(dbLondon, { anchor_london_coop: 100, node_tokyo_mesh: 0, node_sydney_mesh: 0 });
    seedDB(dbTokyo, { anchor_london_coop: 100, node_tokyo_mesh: 0, node_sydney_mesh: 0 });
    seedDB(dbSydney, { anchor_london_coop: 100, node_tokyo_mesh: 0, node_sydney_mesh: 0 });

    console.log("\n📡 Phase 1: London, Tokyo, and Sydney are completely isolated.");
    const nodeLondon = new CMNP2PEngine('anchor_london_coop', 9001, dbLondon);
    const nodeTokyo = new CMNP2PEngine('node_tokyo_mesh', 9002, dbTokyo);
    const nodeSydney = new CMNP2PEngine('node_sydney_mesh', 9003, dbSydney);

    console.log("\n💸 Phase 2: Node London attempts an offline double-spend attack...");
    
    // London pays Tokyo 100 credits
    console.log("\n✍️ London signs Tx A (100 credits to Tokyo)...");
    nodeLondon.createOfflineTransaction('node_tokyo_mesh', 100);

    // We manually rewind London's ledger on disk to mimic a hacked client that is trying to reuse the spent coins
    console.log("\n💻 Malicious Actor resets London's local balance and Nonce on disk to double-spend...");
    const rawState = fs.readFileSync(dbLondon, 'utf8');
    const state = JSON.parse(rawState);
    state.balances['anchor_london_coop'] = 100; // Reset balance
    state.nonces['anchor_london_coop'] = 1;      // Reset Nonce counter
    fs.writeFileSync(dbLondon, JSON.stringify(state, null, 4), 'utf8');

    // Re-initialize London engine to pick up the altered database
    const nodeLondonHacked = new CMNP2PEngine('anchor_london_coop', 9001, dbLondon);

    // London pays Sydney 100 credits using the exact same spent balance & Nonce!
    console.log("\n✍️ London signs Tx B (100 credits to Sydney) with the same Nonce...");
    nodeLondonHacked.createOfflineTransaction('node_sydney_mesh', 100);

    console.log("\n🔌 Phase 3: Nodes reconnect to the mesh network...");
    nodeLondonHacked.startServer();
    nodeTokyo.startServer();
    nodeSydney.startServer();

    console.log("🔗 Connecting Tokyo and Sydney to the mesh network...");
    await nodeTokyo.connectToPeer('127.0.0.1', 9001);   // Tokyo syncs first
    await nodeSydney.connectToPeer('127.0.0.1', 9001);  // Sydney syncs second

    // Give the asynchronous background reconciliation engine time to fire
    await new Promise(r => setTimeout(r, 1500));

    console.log("\n📊 Phase 4: Validating Security Metrics Across the Mesh");
    const meshTokyo = new NexusTrustMesh();
    const meshSydney = new NexusTrustMesh();

    new CMNStorageManager(dbTokyo).rehydrate(meshTokyo);
    new CMNStorageManager(dbSydney).rehydrate(meshSydney);

    console.log("\n✨ Verification Post-Attack:");
    console.log(`🇯🇵 Tokyo Node Balance: ${meshTokyo.balances['node_tokyo_mesh']} (Expected: 100 - Reconciled First)`);
    console.log(`🇦🇺 Sydney Node Balance: ${meshSydney.balances['node_sydney_mesh']} (Expected: 0 - Double Spend Rejected)`);
    console.log(`🚨 Slashed Nodes on Tokyo's registry: ${JSON.stringify(meshTokyo.slashedNodes)}`);
    console.log(`🚨 Slashed Nodes on Sydney's registry: ${JSON.stringify(meshSydney.slashedNodes)}`);

    nodeLondon.stop();
    nodeLondonHacked.stop();
    nodeTokyo.stop();
    nodeSydney.stop();
    console.log("\n🛑 Double-Spend Security Simulation Finished.");
}

runDoubleSpendSimulation();
