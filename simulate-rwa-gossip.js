import fs from 'fs';
import crypto from 'crypto';
import { CMNP2PEngine } from './api/cmn-p2p.js';

// Setup utility to wipe old simulated disk databases
function wipeDBs() {
  ['anchor_london_coop', 'node_tokyo_mesh', 'node_sydney_mesh'].forEach(id => {
    try { fs.unlinkSync(`db_${id}.json`); } catch (e) {}
  });
}

// Helper: Generate Oracle Time-Bound Attestation
function createOracleAttestation(assetId, valuePerUnit, ttlMs, oraclePrivKeyHex, oraclePubKeyHex) {
  const timestamp = Date.now();
  const expiresAt = timestamp + ttlMs;
  const payload = `${assetId}:${valuePerUnit}:${timestamp}:${expiresAt}`;

  const privateKey = crypto.createPrivateKey({
    key: Buffer.from(oraclePrivKeyHex, 'hex'),
    format: 'der',
    type: 'pkcs8'
  });

  const signature = crypto.sign(null, Buffer.from(payload), privateKey).toString('hex');

  return {
    assetId,
    valuePerUnit,
    timestamp,
    expiresAt,
    oracleSignature: signature,
    oraclePublicKey: oraclePubKeyHex
  };
}

async function run() {
  console.log("🌾 Starting Offline RWA Oracle Integration & Validation Simulation...\n");
  wipeDBs();

  // 1. Generate local identities (keys) for the network nodes
  const genKeys = () => {
    const pair = crypto.generateKeyPairSync('ec', { namedCurve: 'secp256k1' });
    return {
      pub: pair.publicKey.export({ format: 'der', type: 'spki' }).toString('hex'),
      priv: pair.privateKey.export({ format: 'der', type: 'pkcs8' }).toString('hex')
    };
  };

  const keys = {
    london: genKeys(),
    tokyo: genKeys(),
    sydney: genKeys(),
    oracle: genKeys() // The RWA Oracle Network Key
  };

  // 2. Spin up P2P Engines
  const london = new CMNP2PEngine('anchor_london_coop', 9001);
  const tokyo = new CMNP2PEngine('node_tokyo_mesh', 9002);
  const sydney = new CMNP2PEngine('node_sydney_mesh', 9003);

  await Promise.all([london.startServer(), tokyo.startServer(), sydney.startServer()]);

  // 3. Setup Initial State (Genesis Ledger where ALL nodes agree on initial balances/assets)
  const setupGenesisState = (engine) => {
    const { trustMesh, oracle, clearing } = engine.storage.load();
    
    // Register Oracle Public Key globally in trust mesh
    trustMesh.publicKeys['oracle_network'] = keys.oracle.pub;
    
    // Distribute Initial Credit balances (Tokyo/Sydney start with credits to buy assets)
    trustMesh.balances = {
      'anchor_london_coop': 100,
      'node_tokyo_mesh': 500,  
      'node_sydney_mesh': 500  
    };

    // Everyone globally agrees London starts with 100 bags of Local Grade-A Wheat
    trustMesh.assets = {
      'anchor_london_coop': { 'wheat_local_v1': 100 },
      'node_tokyo_mesh': {},
      'node_sydney_mesh': {}
    };

    engine.storage.persist(trustMesh, oracle, clearing);
  };

  // Run global initialization across all local DB copies
  setupGenesisState(london);
  setupGenesisState(tokyo);
  setupGenesisState(sydney);

  // ----------------------------------------------------
  // TEST SCENARIO 1: Secure Valid Offline RWA Trade
  // ----------------------------------------------------
  console.log("\n🌾 SCENARIO 1: London sells 30 units of Wheat to Tokyo offline...");
  
  // Oracle mints a valid 1-hour attestation (wheat valued at 5.0 credits each)
  const validAttestation = createOracleAttestation('wheat_local_v1', 5.0, 3600 * 1000, keys.oracle.priv, keys.oracle.pub);

  // London signs the transfer off-grid
  const txA = london.signRWATransaction('node_tokyo_mesh', 'wheat_local_v1', 30, validAttestation, 1, keys.london.priv);

  // Establish Peer Connection: London <-> Tokyo
  console.log("🔗 Connecting London and Tokyo...");
  const connLT = await london.connectToPeer('127.0.0.1', 9002);
  await new Promise(r => setTimeout(r, 500)); // allow TCP handshake

  // Execute Offline Sync
  await london.syncOfflineStore(connLT, [txA]);
  await new Promise(r => setTimeout(r, 800)); // processing buffer

  // ----------------------------------------------------
  // TEST SCENARIO 2: Rejecting Expired Price Attestation
  // ----------------------------------------------------
  console.log("\n⌛ SCENARIO 2: London tries to buy from Sydney using an EXPIRED price feed...");

  // Oracle mints an already expired attestation (TTL of negative 5 mins)
  const expiredAttestation = createOracleAttestation('wheat_local_v1', 5.0, -300 * 1000, keys.oracle.priv, keys.oracle.pub);
  const txExpired = london.signRWATransaction('node_sydney_mesh', 'wheat_local_v1', 10, expiredAttestation, 2, keys.london.priv);

  console.log("🔗 Connecting London and Sydney...");
  const connLS = await london.connectToPeer('127.0.0.1', 9003);
  await new Promise(r => setTimeout(r, 500));

  await london.syncOfflineStore(connLS, [txExpired]);
  await new Promise(r => setTimeout(r, 800));

  // ----------------------------------------------------
  // TEST SCENARIO 3: Detecting Offline RWA Double-Spend
  // ----------------------------------------------------
  console.log("\n🚨 SCENARIO 3: London attempts an offline Asset Double-Spend...");
  console.log("  - London still has 70 wheat left (since Scenario 2 failed).");
  console.log("  - London signs Tx B (Selling 50 wheat to Tokyo, Nonce 2).");
  console.log("  - London cheats nonces and signs Tx C (Selling 50 wheat to Sydney, Nonce 2).");

  const validAttestation2 = createOracleAttestation('wheat_local_v1', 5.0, 3600 * 1000, keys.oracle.priv, keys.oracle.pub);

  // Sign Tx B (To Tokyo)
  const txB = london.signRWATransaction('node_tokyo_mesh', 'wheat_local_v1', 50, validAttestation2, 2, keys.london.priv);

  // Hacker deletes London's local database cache to bypass nonce checks!
  console.log("💾 HACKER: Wiping London's local database metadata to trick client side checks...");
  fs.unlinkSync(`db_anchor_london_coop.json`);
  setupGenesisState(london); // reset memory to genesis state to simulate state-loss

  // Sign Tx C (To Sydney) using the exact same Nonce 2!
  const txC = london.signRWATransaction('node_sydney_mesh', 'wheat_local_v1', 50, validAttestation2, 2, keys.london.priv);

  console.log("\n🔗 establishing P2P mesh: Connecting Tokyo and Sydney directly...");
  const connTS = await tokyo.connectToPeer('127.0.0.1', 9003);
  await new Promise(r => setTimeout(r, 500));

  // Sync Tx B with Tokyo
  console.log("📥 Syncing Tx B with Tokyo...");
  await london.syncOfflineStore(connLT, [txB]);
  await new Promise(r => setTimeout(r, 500));

  // Sync Tx C with Sydney (Sydney has never seen Tx B yet)
  console.log("📥 Syncing Tx C with Sydney...");
  await london.syncOfflineStore(connLS, [txC]);
  await new Promise(r => setTimeout(r, 1200)); // Allow gossip and slashing propagation to clear

  // ----------------------------------------------------
  // 4. Close P2P Engines and Print Ledger State
  // ----------------------------------------------------
  await Promise.all([london.close(), tokyo.close(), sydney.close()]);

  console.log("\n=======================================================");
  console.log("📊 POST-ATTACK RWA LEDGER STATE");
  console.log("=======================================================");

  const dbTokyo = JSON.parse(fs.readFileSync('db_node_tokyo_mesh.json'));
  const dbSydney = JSON.parse(fs.readFileSync('db_node_sydney_mesh.json'));

  console.log("🇯🇵 Tokyo Balances:", dbTokyo.trustMesh.balances);
  console.log("🇯🇵 Tokyo Assets:  ", dbTokyo.trustMesh.assets);
  console.log("🇯🇵 Tokyo Slashed: ", dbTokyo.trustMesh.slashedNodes);
  console.log("");
  console.log("🇦🇺 Sydney Balances:", dbSydney.trustMesh.balances);
  console.log("🇦🇺 Sydney Assets:  ", dbSydney.trustMesh.assets);
  console.log("🇦🇺 Sydney Slashed: ", dbSydney.trustMesh.slashedNodes);

  // Assertion Checks
  const isSlashed = dbTokyo.trustMesh.slashedNodes.includes('anchor_london_coop') &&
                    dbSydney.trustMesh.slashedNodes.includes('anchor_london_coop');
  
  // Did Tokyo roll back or keep the safe transaction?
  // London should only have been credited for Tx A (30 wheat * 5 = 150 credits).
  // Tokyo should have 350 credits left (500 start - 150 spend) and 30 wheat.
  // Sydney should have 500 credits left (reverted) and 0 wheat.
  const isRecovered = dbTokyo.trustMesh.balances['node_tokyo_mesh'] === 350 &&
                      dbSydney.trustMesh.balances['node_sydney_mesh'] === 500;

  if (isSlashed && isRecovered) {
    console.log("\n🏆 RWA ORACLE SIMULATION SUCCESSFUL!");
    console.log("  - Scenario 1 (Valid offline trade) cleared perfectly.");
    console.log("  - Scenario 2 (Expired attestation) was successfully blocked.");
    console.log("  - Scenario 3 (Asset Double-Spend) was detected, London slashed, and balances safely reverted!");
  } else {
    console.log("\n❌ SIMULATION FAILURE. Check outputs and trace logs.");
  }
}

run().catch(console.error);
