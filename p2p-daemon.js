/**
 * CMN Decentralized P2P Gossip Daemon
 * Layer: Mesh Topology Auto-Discovery & Convergence Engine
 */

import dgram from 'dgram';
import fetch from 'node-fetch';

const MULTICAST_ADDR = '224.0.0.251'; // Standard Local Network Link Multicast Group
const UDP_PORT = 7777;                 // Dedicated Discovery Sub-channel
const LOCAL_HTTP_PORT = 3000;         // Local Vercel Dev server address port

// Generate dynamic signature fingerprint for this execution instance
const DAEMON_INSTANCE_ID = `node_peer_${Math.random().toString(36).substring(2, 7)}`;
const activeMeshPeers = new Set();

const udpSocket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

// 1. Bind and join Multicast Group
udpSocket.bind(UDP_PORT, () => {
    udpSocket.addMembership(MULTICAST_ADDR);
    console.log(`📡 [P2P MESH] Auto-discovery Engine online. Instance Tag: ${DAEMON_INSTANCE_ID}`);
});

// 2. Broadcast Heartbeat Signature down the Multicast pipeline
setInterval(() => {
    const payload = JSON.stringify({
        instanceId: DAEMON_INSTANCE_ID,
        httpPort: LOCAL_HTTP_PORT,
        timestamp: Date.now()
    });
    
    udpSocket.send(payload, UDP_PORT, MULTICAST_ADDR, (err) => {
        if (err) console.error("⚠️ Multicast broadcast drop:", err.message);
    });
}, 4000);

// 3. Process inbound remote node pings
udpSocket.on('message', (msg, rinfo) => {
    try {
        const peerInfo = JSON.parse(msg.toString());
        
        // Skip self-reflections
        if (peerInfo.instanceId === DAEMON_INSTANCE_ID) return;

        const peerTargetAddress = `http://${rinfo.address}:${peerInfo.httpPort}`;
        
        if (!activeMeshPeers.has(peerTargetAddress)) {
            activeMeshPeers.add(peerTargetAddress);
            console.log(`✨ [DISCOVERY] Peer found on local subnet -> ${peerTargetAddress} [ID: ${peerInfo.instanceId}]`);
        }
    } catch (e) { /* Discard malformed noise packets */ }
});

// 4. Periodic Anti-Entropy Gossip Pipeline Loop
setInterval(async () => {
    if (activeMeshPeers.size === 0) return;

    // Pick a random node from the discovered peer map to gossip with
    const targetPeer = Array.from(activeMeshPeers)[Math.floor(Math.random() * activeMeshPeers.size)];
    
    try {
        // Fetch local ledger state
        const localRes = await fetch(`http://localhost:${LOCAL_HTTP_PORT}/api/p2p-sync`);
        const localState = await localRes.json();

        // Push local ledger state down to discovered remote target peer
        console.log(`🔄 [GOSSIP] Merging ledger state vectors outward to -> ${targetPeer}/api/p2p-sync`);
        const remotePush = await fetch(`${targetPeer}/api/p2p-sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(localState)
        });
        const pushResult = await remotePush.json();

        // Pull remote state from target peer to update local database
        const remotePullRes = await fetch(`${targetPeer}/api/p2p-sync`);
        const remoteState = await remotePullRes.json();

        await fetch(`http://localhost:${LOCAL_HTTP_PORT}/api/p2p-sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(remoteState)
        });

    } catch (err) {
        console.log(`❌ [MESH LINK FAULT] Removing unresponsive peer channel: ${targetPeer}`);
        activeMeshPeers.delete(targetPeer);
    }
}, 8000);
