/**
<<<<<<< HEAD
 * CMN Multi-Hop Clearing & Trust Graph Routing Engine
 * Architectural Layer: DGEA Liquidity Clearing Framework
 */

class CMNClearingEngine {
    constructor(trustMesh) {
        this.trustMesh = trustMesh; // References live memory state vectors
    }

    /**
     * Finds a valid trust liquidity path from sender to receiver using BFS
     */
    findTrustPath(sender, receiver, amount) {
        if (sender === receiver) return null;

        const queue = [[sender]];
        const visited = new Set([sender]);

        while (queue.length > 0) {
            const path = queue.shift();
            const currentNode = path[path.length - 1];

            if (currentNode === receiver) {
                return path;
            }

            // Inspect all potential neighbors in the network
            const neighbors = Object.keys(this.trustMesh.balances || {});
            
            for (const neighbor of neighbors) {
                if (neighbor === currentNode || visited.has(neighbor)) continue;

                // Determine capacity: How much can currentNode safely pass to neighbor?
                const currentBalance = this.trustMesh.balances[currentNode] || 0;
                const outVouches = this.trustMesh.vouchers?.[currentNode] || {};
                const maxNegativeLimit = Object.values(outVouches).reduce((a, b) => a + b, 0);
                
                const totalAvailableLiquidity = currentBalance + maxNegativeLimit;

                // If this specific link has enough liquidity headroom, traverse it
                if (totalAvailableLiquidity >= amount) {
                    visited.add(neighbor);
                    queue.push([...path, neighbor]);
                }
            }
        }
        return null; // No liquid connection paths exist
    }

    /**
     * Executes an atomic multi-hop payment settlement across a trust chain
     */
    clearPayment(sender, receiver, amount) {
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            throw new Error("Invalid clearing volume requested.");
        }

        // 1. Compute optimal liquidity path through the graph mesh
        const trustPath = this.findTrustPath(sender, receiver, parsedAmount);
        
        if (!trustPath) {
            throw new Error(`Liquidity Exhausted: No path with sufficient trust lines connects '${sender}' to '${receiver}'.`);
        }

        console.log(`🔗 [ROUTING ENGINE] Path discovered: ${trustPath.join(' -> ')}`);

        // 2. Atomically ripple balances down the chain lines
        // For a path [A, B, C]: A pays B, B pays C. B's net balance variation is zero.
        for (let i = 0; i < trustPath.length - 1; i++) {
            const currentHop = trustPath[i];
            const nextHop = trustPath[i + 1];

            this.trustMesh.balances[currentHop] -= parsedAmount;
            this.trustMesh.balances[nextHop] += parsedAmount;
        }

        // 3. Document tracking activity indices
        const receiptId = `cmn_rcpt_${Math.random().toString(36).substring(2, 10)}`;
        
        if (!this.trustMesh.accountActivity) this.trustMesh.accountActivity = {};
        if (!this.trustMesh.accountActivity[sender]) this.trustMesh.accountActivity[sender] = [];
        if (!this.trustMesh.accountActivity[receiver]) this.trustMesh.accountActivity[receiver] = [];

        const logEntry = {
            receiptId,
            type: 'TRANSFER',
            path: trustPath,
            amount: parsedAmount,
            timestamp: Date.now()
        };

        this.trustMesh.accountActivity[sender].push(logEntry);
        this.trustMesh.accountActivity[receiver].push(logEntry);

        return {
            success: true,
            receiptId,
            pathUsed: trustPath,
            senderFinalBalance: this.trustMesh.balances[sender],
            receiverFinalBalance: this.trustMesh.balances[receiver]
        };
    }
=======
 * CMN 0% Interest Clearing & Velocity Engine
 * Architectural Layer: DGEA Core Framework
 */

class CMNClearingEngine {
    constructor(trustMeshInstance) {
        // Link directly to our live Trust Mesh ledger database
        this.ledger = trustMeshInstance;
        
        // Activity tracking for Velocity Rule enforcement
        this.accountActivity = {};
        
        // Protocol Constants (180 days calculated in milliseconds)
        this.STAGNATION_LIMIT_MS = 180 * 24 * 60 * 60 * 1000; 
    }

    /**
     * Log structural movement to refresh the account's velocity lifespan
     */
    recordActivity(userId) {
        this.accountActivity[userId] = {
            lastInboundTimestamp: Date.now(),
            isFrozen: false
        };
    }

    /**
     * Clear zero-friction transactional volume between network nodes
     */
    clearPayment(senderId, receiverId, amount) {
        // Ensure activity profiles exist
        if (!this.accountActivity[senderId]) this.recordActivity(senderId);
        if (!this.accountActivity[receiverId]) this.recordActivity(receiverId);

        // Assert Velocity Rule safety constraints before moving capital
        this.evaluateVelocityConstraint(senderId);

        // Route directly through the trust ledger mesh layers
        const executionReceipt = this.ledger.executeTransaction(senderId, receiverId, amount);

        // Productive inbound movement resets the receiver's velocity window
        this.accountActivity[receiverId].lastInboundTimestamp = Date.now();
        this.accountActivity[receiverId].isFrozen = false;

        return {
            receiptId: `TX-CLR-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
            timestamp: Date.now(),
            ledgerStatus: executionReceipt.status,
            senderFinalBalance: executionReceipt.senderBalance,
            receiverFinalBalance: executionReceipt.receiverBalance
        };
    }

    /**
     * The Velocity Rule Enforcement Engine
     * Checks if an account has sat flat with no inbound balance changes
     */
    evaluateVelocityConstraint(userId) {
        const activity = this.accountActivity[userId];
        if (!activity) return;

        const currentBalance = this.ledger.balances[userId] || 0;
        const idleDuration = Date.now() - activity.lastInboundTimestamp;

        // Constraint: If balance is negative and has stagnated past the limit
        if (currentBalance < 0 && idleDuration > this.STAGNATION_LIMIT_MS) {
            activity.isFrozen = true;
            throw new Error(
                `Transaction blocked. Account ${userId} has breached the 180-day Velocity Rule. ` +
                `Spending privileges are frozen until inbound production value is provided.`
            );
        }
    }

    /**
     * Systemic Audit Routine (Simulates network epochs running across all nodes)
     */
    runSystemicVelocityAudit() {
        const auditedAccounts = [];
        
        for (const userId in this.accountActivity) {
            const currentBalance = this.ledger.balances[userId] || 0;
            const idleDuration = Date.now() - this.accountActivity[userId].lastInboundTimestamp;

            if (currentBalance < 0 && idleDuration > this.STAGNATION_LIMIT_MS) {
                this.accountActivity[userId].isFrozen = true;
                auditedAccounts.push({ userId: userId, action: "SUSPENDED_SPENDING" });
            }
        }

        return auditedAccounts;
    }
>>>>>>> a123d0b1846a7236b4e725b0b1f82619f5f68980
}

export default CMNClearingEngine;
