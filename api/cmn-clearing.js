/**
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
}

export default CMNClearingEngine;
