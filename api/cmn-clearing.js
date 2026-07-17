/**
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
}

export default CMNClearingEngine;
