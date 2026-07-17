import fs from 'fs';
import crypto from 'crypto';
import { CMNP2PEngine } from './api/cmn-p2p.js';

// Clean DB Files helper
function cleanDBs() {
  const files = ['db_anchor_london_coop.json', 'db_node_tokyo_mesh.json', 'db_node_sydney_mesh.json'];
  files.forEach(f => {
    if (fs.existsSync(f)) fs.unlinkSync(f);
  });
}

async function runGossipSimulation() {
  cleanDBs();
  console.log("🚀 Starting Multi-Hop Gossip and Fraud-Propagation Simulation...\n");

  // Generate private keys for cryptographic identities
  const keyPairLondon = crypto.generateKeyPairSync('ed25519');
  const londonPrivateKeyHex = keyPairLondon.privateKey.export({ format: 'der', type: 'pkcs8' }).toString('hex');

  // 1. Initialize local nodes
  const london = new CMNP2PEngine('anchor_london_coop', 9001);
  const tokyo = new CMNP2PEngine('node_tokyo_mesh', 9002);
  const sydney = new CMNP2PEngine('node_sydney_mesh', 9003);

  await london.startServer();
  await tokyo.startServer();
  await sydney.startServer();

  // 2. Offline Phase: London generates two conflicting transactions (Double-spend)
  console.log("\n📡 Phase 1: London signs Tx A (100 to Tokyo, Nonce 1)");
  const txA = london.signTransaction('node_tokyo_mesh', 100, 1, londonPrivateKeyHex);

  console.log("💾 HACKER: Resetting London's local disk cache to cheat nonces...");
  
  console.log("📡 Phase 2: London signs Tx B (100 to Sydney, Nonce 1)");
  const txB = london.signTransaction('node_sydney_mesh', 100, 1, londonPrivateKeyHex);

  // 3. P2P Phase 1: London connects to Tokyo and flushes Tx A
  console.log("\n🔗 Phase 3: Connecting London to Tokyo directly...");
  const londonToTokyoSocket = await london.connectToPeer('127.0.0.1', 9002);
  await london.syncOfflineStore(londonToTokyoSocket, [txA]);

  // Wait a moment for transaction reconciliation
  await new Promise(r => setTimeout(r, 100));

  // 4. P2P Phase 2: Tokyo and Sydney connect (Tokyo <-> Sydney link)
  console.log("\n🔗 Phase 4: Tokyo peers with Sydney (Establishing Mesh: London <-> Tokyo <-> Sydney)");
  const tokyoToSydneySocket = await tokyo.connectToPeer('127.0.0.1', 9003);

  await new Promise(r => setTimeout(r, 100));

  // 5. P2P Phase 3: London connects to Sydney and flushes Tx B
  console.log("\n🔗 Phase 5: London connects to Sydney directly (Sydney has never heard of Tx A)...");
  const londonToSydneySocket = await london.connectToPeer('127.0.0.1', 9003);
  await london.syncOfflineStore(londonToSydneySocket, [txB]);

  // Wait for gossip propagation across the hops
  await new Promise(r => setTimeout(r, 500));

  // 6. Final Evaluation
  console.log("\n📊 Phase 6: Validating Post-Attack Gossip Ledger State");
  
  const tokyoData = tokyo.storage.load();
  const sydneyData = sydney.storage.load();

  console.log(`\n🇯🇵 Tokyo Ledger Balances:`, tokyoData.trustMesh.balances);
  console.log(`🇦🇺 Sydney Ledger Balances:`, sydneyData.trustMesh.balances);

  console.log(`🇯🇵 Tokyo Slashed List:`, tokyoData.trustMesh.slashedNodes);
  console.log(`🇦🇺 Sydney Slashed List:`, sydneyData.trustMesh.slashedNodes);

  // Assertions
  const tokyoSuccess = tokyoData.trustMesh.balances['node_tokyo_mesh'] === 100;
  const sydneySuccess = sydneyData.trustMesh.balances['node_sydney_mesh'] === 0;
  const londonSlashedEverywhere = tokyoData.trustMesh.slashedNodes.includes('anchor_london_coop') && 
                                  sydneyData.trustMesh.slashedNodes.includes('anchor_london_coop');

  console.log("\n---");
  if (tokyoSuccess && sydneySuccess && londonSlashedEverywhere) {
    console.log("🏆 SIMULATION SUCCESSFUL!");
    console.log("  - Tokyo kept its 100 credits.");
    console.log("  - Sydney rejected London's double-spend, returning its balance to 0.");
    console.log("  - London was successfully slashed on ALL nodes via multi-hop fraud propagation!");
  } else {
    console.log("❌ SIMULATION FAILED. Check console logs for errors.");
  }

  // Shutdown nodes
  await london.close();
  await tokyo.close();
  await sydney.close();
  cleanDBs();
  process.exit(0);
}

runGossipSimulation();
