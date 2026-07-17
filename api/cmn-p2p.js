import net from 'net';
import crypto from 'crypto';
import { CMNStorageManager } from './cmn-storage.js';

export class CMNP2PEngine {
  constructor(nodeId, port) {
    this.nodeId = nodeId;
    this.port = port;
    this.storage = new CMNStorageManager(nodeId);
    this.peers = new Set(); 
    this.seenMessages = new Set(); 
    this.server = null;
  }

  startServer() {
    return new Promise((resolve) => {
      this.server = net.createServer((socket) => {
        this.peers.add(socket);
        this.setupSocketHandler(socket);
        this.requestHistorySync(socket); // Reconcile history on connection
      });

      this.server.listen(this.port, () => {
        console.log(`📡 Node [${this.nodeId}] P2P Server listening on port ${this.port}`);
        resolve();
      });
    });
  }

  connectToPeer(ip, targetPort) {
    return new Promise((resolve, reject) => {
      const socket = net.createConnection({ host: ip, port: targetPort }, () => {
        this.peers.add(socket);
        this.setupSocketHandler(socket);
        this.requestHistorySync(socket); // Reconcile history on connection
        resolve(socket);
      });

      socket.on('error', (err) => {
        reject(err);
      });
    });
  }

  setupSocketHandler(socket) {
    let buffer = '';

    socket.on('data', (data) => {
      buffer += data.toString();
      let boundary = buffer.indexOf('\n');
      while (boundary !== -1) {
        const line = buffer.substring(0, boundary).trim();
        buffer = buffer.substring(boundary + 1);
        if (line) {
          try {
            const message = JSON.parse(line);
            this.handleInboundPacket(message, socket);
          } catch (err) {
            console.error(`🛑 [P2P ERROR] Failed to parse inbound packet: ${err.message}`);
          }
        }
        boundary = buffer.indexOf('\n');
      }
    });

    socket.on('close', () => {
      this.peers.delete(socket);
    });

    socket.on('error', () => {
      this.peers.delete(socket);
    });
  }

  broadcastGossip(payload, excludeSocket = null) {
    const payloadStr = JSON.stringify(payload) + '\n';
    for (const socket of this.peers) {
      if (socket !== excludeSocket && !socket.destroyed) {
        try {
          socket.write(payloadStr);
        } catch (err) {
          this.peers.delete(socket);
        }
      }
    }
  }

  // Request history sync from a peer
  requestHistorySync(socket) {
    const { clearing } = this.storage.load();
    const activeTxIds = Object.keys(clearing.accountActivity);
    const syncReq = {
      type: 'HISTORY_REQUEST',
      knownIds: activeTxIds
    };
    try {
      socket.write(JSON.stringify(syncReq) + '\n');
    } catch (e) {}
  }

  processTransaction(tx, socket, trustMesh, oracle, clearing) {
    if (trustMesh.slashedNodes.includes(tx.sender)) {
      console.error(`🛑 [SECURITY BLOCKED] Rejected Tx ${tx.id} - Sender [${tx.sender}] is globally slashed.`);
      return false;
    }

    let peerPublicKey = trustMesh.publicKeys[tx.sender];
    if (!peerPublicKey) {
      peerPublicKey = tx.senderPublicKey;
      trustMesh.publicKeys[tx.sender] = peerPublicKey;
    }

    const signPayload = `${tx.id}:${tx.sender}:${tx.recipient}:${tx.amount || 0}:${tx.nonce}:${tx.timestamp}`;
    let isSignatureGenuine = false;
    try {
      const pubKeyObj = crypto.createPublicKey({
        key: Buffer.from(peerPublicKey, 'hex'),
        format: 'der',
        type: 'spki'
      });
      isSignatureGenuine = crypto.verify(
        null,
        Buffer.from(signPayload),
        pubKeyObj,
        Buffer.from(tx.signature, 'hex')
      );
    } catch (e) {
      isSignatureGenuine = false;
    }

    if (!isSignatureGenuine) {
      console.error(`🛑 [CRYPTOGRAPHIC ERROR] Sender signature mismatch on Tx ${tx.id}`);
      return false;
    }

    const historicalConflict = Object.values(clearing.accountActivity).find(
      pastTx => pastTx.sender === tx.sender && pastTx.nonce === tx.nonce && pastTx.id !== tx.id
    );

    if (historicalConflict) {
      console.error(`\n🚨🚨🚨 [EQUIVOCATION DETECTED LOCALLY] 🚨🚨🚨`);
      console.error(`Node [${tx.sender}] double-spent Nonce [${tx.nonce}]!`);
      
      if (!trustMesh.slashedNodes.includes(tx.sender)) {
        trustMesh.slashedNodes.push(tx.sender);
      }

      if (historicalConflict.status === 'COMMITTED') {
        console.log(`↩️ [LOCAL RECOVERY] Reverting previously committed transaction ${historicalConflict.id} from double-spender.`);
        if (historicalConflict.assetId) {
          trustMesh.assets[historicalConflict.sender][historicalConflict.assetId] += historicalConflict.quantity;
          if (!trustMesh.assets[historicalConflict.recipient]) trustMesh.assets[historicalConflict.recipient] = {};
          trustMesh.assets[historicalConflict.recipient][historicalConflict.assetId] -= historicalConflict.quantity;
          
          const settlementValue = historicalConflict.quantity * historicalConflict.oracleAttestation.valuePerUnit;
          trustMesh.balances[historicalConflict.recipient] += settlementValue;
          trustMesh.balances[historicalConflict.sender] -= settlementValue;
        } else {
          trustMesh.balances[historicalConflict.sender] += historicalConflict.amount;
          trustMesh.balances[historicalConflict.recipient] -= historicalConflict.amount;
        }
        historicalConflict.status = 'REVERTED_FRAUD';
      }

      this.storage.persist(trustMesh, oracle, clearing);

      const fraudProof = {
        type: 'GOSSIP_SLASH',
        id: `msg_slash_${tx.sender}_${tx.nonce}_${Date.now()}`,
        offender: tx.sender,
        txA: {
          id: historicalConflict.id,
          sender: historicalConflict.sender,
          recipient: historicalConflict.recipient,
          amount: historicalConflict.amount || 0,
          assetId: historicalConflict.assetId || null,
          quantity: historicalConflict.quantity || 0,
          nonce: historicalConflict.nonce,
          timestamp: historicalConflict.timestamp,
          signature: historicalConflict.signature,
          senderPublicKey: historicalConflict.senderPublicKey || peerPublicKey,
          oracleAttestation: historicalConflict.oracleAttestation || null
        },
        txB: tx
      };
      this.broadcastGossip(fraudProof, socket);
      return false;
    }

    if (tx.assetId && tx.oracleAttestation) {
      const att = tx.oracleAttestation;
      const currentTime = Date.now();
      if (currentTime > att.expiresAt) {
        console.error(`❌ [RWA EXPIRED] Oracle price feed expired at ${new Date(att.expiresAt).toISOString()}. Local time is ${new Date(currentTime).toISOString()}`);
        return false;
      }

      const trustedOracleKey = trustMesh.publicKeys['oracle_network'];
      if (!trustedOracleKey) {
        console.error(`❌ [RWA ERROR] No trusted Oracle public key registered in trustMesh.`);
        return false;
      }

      if (att.oraclePublicKey !== trustedOracleKey) {
        console.error(`❌ [RWA ERROR] Attestation signed by untrusted oracle key!`);
        return false;
      }

      const attestationPayload = `${att.assetId}:${att.valuePerUnit}:${att.timestamp}:${att.expiresAt}`;
      let isOracleSigValid = false;
      try {
        const oraclePubKeyObj = crypto.createPublicKey({
          key: Buffer.from(trustedOracleKey, 'hex'),
          format: 'der',
          type: 'spki'
        });
        isOracleSigValid = crypto.verify(
          null,
          Buffer.from(attestationPayload),
          oraclePubKeyObj,
          Buffer.from(att.oracleSignature, 'hex')
        );
      } catch (e) {
        isOracleSigValid = false;
      }

      if (!isOracleSigValid) {
        console.error(`❌ [RWA SECURITY ALERT] Oracle Signature Verification Failed on Asset: ${tx.assetId}`);
        return false;
      }

      if (!trustMesh.assets) trustMesh.assets = {};
      if (!trustMesh.assets[tx.sender]) trustMesh.assets[tx.sender] = {};
      const senderAssetBalance = trustMesh.assets[tx.sender][tx.assetId] || 0;
      if (senderAssetBalance < tx.quantity) {
        console.error(`❌ [RWA ERROR] Sender [${tx.sender}] has insufficient asset balance of ${tx.assetId}. Has: ${senderAssetBalance}, Needs: ${tx.quantity}`);
        return false;
      }

      const settlementValue = tx.quantity * att.valuePerUnit;
      const receiverCreditBalance = trustMesh.balances[tx.recipient] || 0;
      if (receiverCreditBalance < settlementValue) {
        console.error(`❌ [RWA ERROR] Purchaser [${tx.recipient}] has insufficient credit balance to settle. Has: ${receiverCreditBalance}, Cost: ${settlementValue}`);
        return false;
      }

      trustMesh.assets[tx.sender][tx.assetId] -= tx.quantity;
      if (!trustMesh.assets[tx.recipient]) trustMesh.assets[tx.recipient] = {};
      trustMesh.assets[tx.recipient][tx.assetId] = (trustMesh.assets[tx.recipient][tx.assetId] || 0) + tx.quantity;

      trustMesh.balances[tx.recipient] -= settlementValue;
      trustMesh.balances[tx.sender] = (trustMesh.balances[tx.sender] || 0) + settlementValue;

      console.log(`✅ [LEDGER MERGE - RWA] Settled RWA: ${tx.sender} -> ${tx.quantity} units of ${tx.assetId} to ${tx.recipient} for ${settlementValue} credits.`);
    } else {
      const senderBalance = trustMesh.balances[tx.sender] || 0;
      if (senderBalance < tx.amount) {
        console.error(`❌ [RECONCILE REJECTED] Tx ${tx.id} - Sender [${tx.sender}] has insufficient funds.`);
        return false;
      }

      trustMesh.balances[tx.sender] -= tx.amount;
      trustMesh.balances[tx.recipient] = (trustMesh.balances[tx.recipient] || 0) + tx.amount;
      console.log(`✅ [LEDGER MERGE] Committed Offline Tx: ${tx.id} (${tx.amount} credits)`);
    }

    clearing.accountActivity[tx.id] = {
      status: 'COMMITTED',
      id: tx.id,
      sender: tx.sender,
      recipient: tx.recipient,
      amount: tx.amount || 0,
      assetId: tx.assetId || null,
      quantity: tx.quantity || 0,
      oracleAttestation: tx.oracleAttestation || null,
      nonce: tx.nonce,
      timestamp: tx.timestamp,
      signature: tx.signature,
      senderPublicKey: tx.senderPublicKey
    };

    this.storage.persist(trustMesh, oracle, clearing);
    return true;
  }

  handleInboundPacket(message, socket) {
    const { trustMesh, oracle, clearing } = this.storage.load();

    if (message.type === 'HISTORY_REQUEST') {
      const missingTxs = Object.values(clearing.accountActivity)
        .filter(tx => tx.status === 'COMMITTED' && !message.knownIds.includes(tx.id));
      
      if (missingTxs.length > 0) {
        try {
          socket.write(JSON.stringify({ type: 'OFFLINE_RECONCILE', payload: missingTxs }) + '\n');
        } catch (e) {}
      }
    }

    else if (message.type === 'OFFLINE_RECONCILE') {
      const incomingTxs = message.payload;
      console.log(`📥 [SYNC] Node [${this.nodeId}] received sync queue with ${incomingTxs.length} transactions`);

      for (const tx of incomingTxs) {
        if (clearing.accountActivity[tx.id]) continue; 

        const success = this.processTransaction(tx, socket, trustMesh, oracle, clearing);
        if (success) {
          const gossipTx = {
            type: 'GOSSIP_TX',
            id: `msg_tx_${tx.id}`,
            tx: tx
          };
          this.broadcastGossip(gossipTx, socket);
        }
      }
    }

    else if (message.type === 'GOSSIP_TX') {
      const msgId = message.id;
      if (this.seenMessages.has(msgId)) return; 
      this.seenMessages.add(msgId);

      const tx = message.tx;
      console.log(`📡 [GOSSIP RECEIVED] Node [${this.nodeId}] received gossip Tx: ${tx.id}`);

      if (clearing.accountActivity[tx.id]) return; 

      const success = this.processTransaction(tx, socket, trustMesh, oracle, clearing);
      if (success) {
        this.broadcastGossip(message, socket); 
      }
    }

    else if (message.type === 'GOSSIP_SLASH') {
      const msgId = message.id;
      if (this.seenMessages.has(msgId)) return; 
      this.seenMessages.add(msgId);

      console.log(`📡 [GOSSIP RECEIVED] Node [${this.nodeId}] received Fraud Proof for sender [${message.offender}]`);

      if (trustMesh.slashedNodes.includes(message.offender)) {
        this.broadcastGossip(message, socket); 
        return;
      }

      if (message.txA.nonce !== message.txB.nonce || message.txA.id === message.txB.id) {
        console.error(`🛑 [FRAUD SECURITY FAILURE] Received false/malformed fraud payload. Dropping.`);
        return;
      }

      const verifyTx = (tx) => {
        const signPayload = `${tx.id}:${tx.sender}:${tx.recipient}:${tx.amount || 0}:${tx.nonce}:${tx.timestamp}`;
        try {
          const pubKeyObj = crypto.createPublicKey({
            key: Buffer.from(tx.senderPublicKey, 'hex'),
            format: 'der',
            type: 'spki'
          });
          return crypto.verify(
            null,
            Buffer.from(signPayload),
            pubKeyObj,
            Buffer.from(tx.signature, 'hex')
          );
        } catch (err) {
          return false;
        }
      };

      if (!verifyTx(message.txA) || !verifyTx(message.txB)) {
        console.error(`🛑 [FRAUD SECURITY FAILURE] Signature verification failed inside Fraud Proof.`);
        return;
      }

      console.log(`🚨 [FRAUD PROOF CONFIRMED] Node [${this.nodeId}] validated signatures on conflicting payloads! Slashing [${message.offender}] globally.`);
      if (!trustMesh.slashedNodes.includes(message.offender)) {
        trustMesh.slashedNodes.push(message.offender);
      }
      
      const revertTxIfCommitted = (txToRevert) => {
        const localRecord = clearing.accountActivity[txToRevert.id];
        if (localRecord && localRecord.status === 'COMMITTED') {
          console.log(`↩️ [RECOVERY] Reverting transaction ${txToRevert.id} from double-spender.`);
          if (txToRevert.assetId) {
            trustMesh.assets[txToRevert.sender][txToRevert.assetId] += txToRevert.quantity;
            if (!trustMesh.assets[txToRevert.recipient]) trustMesh.assets[txToRevert.recipient] = {};
            trustMesh.assets[txToRevert.recipient][txToRevert.assetId] -= txToRevert.quantity;
            
            const settlementValue = txToRevert.quantity * txToRevert.oracleAttestation.valuePerUnit;
            trustMesh.balances[txToRevert.recipient] += settlementValue;
            trustMesh.balances[txToRevert.sender] -= settlementValue;
          } else {
            trustMesh.balances[txToRevert.sender] += txToRevert.amount;
            trustMesh.balances[txToRevert.recipient] -= txToRevert.amount;
          }
          localRecord.status = 'REVERTED_FRAUD';
        }
      };

      revertTxIfCommitted(message.txA);
      revertTxIfCommitted(message.txB);

      this.storage.persist(trustMesh, oracle, clearing);
      this.broadcastGossip(message, socket);
    }
  }

  signTransaction(recipient, amount, nonce, privateKeyHex) {
    const txId = crypto.randomBytes(8).toString('hex');
    const timestamp = Date.now();
    const signPayload = `${txId}:${this.nodeId}:${recipient}:${amount}:${nonce}:${timestamp}`;

    const privateKey = crypto.createPrivateKey({
      key: Buffer.from(privateKeyHex, 'hex'),
      format: 'der',
      type: 'pkcs8'
    });

    const signature = crypto.sign(null, Buffer.from(signPayload), privateKey).toString('hex');
    const publicKey = crypto.createPublicKey(privateKey);
    const senderPublicKey = publicKey.export({ format: 'der', type: 'spki' }).toString('hex');

    return {
      id: txId,
      sender: this.nodeId,
      recipient,
      amount,
      nonce,
      timestamp,
      signature,
      senderPublicKey
    };
  }

  signRWATransaction(recipient, assetId, quantity, oracleAttestation, nonce, privateKeyHex) {
    const txId = crypto.randomBytes(8).toString('hex');
    const timestamp = Date.now();
    const signPayload = `${txId}:${this.nodeId}:${recipient}:0:${nonce}:${timestamp}`; 

    const privateKey = crypto.createPrivateKey({
      key: Buffer.from(privateKeyHex, 'hex'),
      format: 'der',
      type: 'pkcs8'
    });

    const signature = crypto.sign(null, Buffer.from(signPayload), privateKey).toString('hex');
    const publicKey = crypto.createPublicKey(privateKey);
    const senderPublicKey = publicKey.export({ format: 'der', type: 'spki' }).toString('hex');

    return {
      id: txId,
      sender: this.nodeId,
      recipient,
      assetId,
      quantity,
      oracleAttestation,
      nonce,
      timestamp,
      signature,
      senderPublicKey
    };
  }

  async syncOfflineStore(socket, offlineQueue) {
    const payload = {
      type: 'OFFLINE_RECONCILE',
      payload: offlineQueue
    };
    socket.write(JSON.stringify(payload) + '\n');
  }

  async close() {
    for (const socket of this.peers) {
      socket.destroy();
    }
    if (this.server) {
      await new Promise((resolve) => this.server.close(resolve));
    }
  }
}
