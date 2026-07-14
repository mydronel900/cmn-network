/**
 * CMN Sovereign Credit Tracker & Nexus Trust Mesh
 * Architectural Layer: DGEA Core Framework
 */

class NexusTrustMesh {
    constructor() {
        this.balances = {};  // userId -> current CMN balance (can go negative)
        this.vouches = {};   // voucherId -> { vaucheeId: amount } (Outbound trust)
        this.vouchers = {};  // vaucheeId -> { voucherId: amount } (Inbound trust)
        
        // Layer B: Local Cooperative allocation pool mappings
        this.coopAllocations = {}; // coopId -> { memberId: amount }
    }

    /**
     * Initialize a new user profile inside the mesh ledger
     */
    initializeAccount(userId, initialBalance = 0) {
        if (!this.balances[userId]) {
            this.balances[userId] = initialBalance;
            this.vouches[userId] = {};
            this.vouchers[userId] = {};
        }
    }

    /**
     * LAYER A: Direct Peer-to-Peer Vouching
     * A user stakes their own credit limit to vouch for another individual's liquidity
     */
    addPeerVouch(voucherId, vaucheeId, amount) {
        if (voucherId === vaucheeId) throw new Error("Self-vouching violates trust mesh geometry.");
        if (amount <= 0) throw new Error("Vouch magnitude must be positive.");

        this.initializeAccount(voucherId);
        this.initializeAccount(vaucheeId);

        // Record outbound trust vector
        this.vouches[voucherId][vaucheeId] = amount;
        // Record inbound trust vector
        this.vouchers[vaucheeId][voucherId] = amount;

        return { voucher: voucherId, vauchee: vaucheeId, limitExtended: amount };
    }

    /**
     * LAYER B: Local Cooperative Guild Allocation
     * Community nodes pool resources to provide baseline credit access to local operators
     */
    allocateCoopCredit(coopId, memberId, amount) {
        if (!this.coopAllocations[coopId]) {
            this.coopAllocations[coopId] = {};
        }
        this.coopAllocations[coopId][memberId] = amount;
        this.initializeAccount(memberId);
    }

    /**
     * Algorithmic Credit Limit Processor
     * Dynamically calculates a user's Maximum Negative Balance Limit ($V_{max}$)
     * 
     * $$V_{max}(u) = \sum (PeerVouches) + \sum (CoopAllocations)$$
     */
    calculateMaxNegativeLimit(userId) {
        this.initializeAccount(userId);

        // Aggregate Layer A: Peer-to-peer direct vouches
        const peerTrustVectors = Object.values(this.vouchers[userId]);
        const totalPeerTrust = peerTrustVectors.reduce((sum, amt) => sum + amt, 0);

        // Aggregate Layer B: Cooperative guild allocations
        let totalCoopTrust = 0;
        for (const coopId in this.coopAllocations) {
            if (this.coopAllocations[coopId][userId]) {
                totalCoopTrust += this.coopAllocations[coopId][userId];
            }
        }

        // Return global capacity constraint limit
        return totalPeerTrust + totalCoopTrust;
    }

    /**
     * Evaluate transaction feasibility against credit limitations
     */
    executeTransaction(senderId, receiverId, amount) {
        if (amount <= 0) throw new Error("Transaction amount must be greater than zero.");
        
        this.initializeAccount(senderId);
        this.initializeAccount(receiverId);

        const currentSenderBalance = this.balances[senderId];
        const maxNegativeLimit = this.calculateMaxNegativeLimit(senderId);
        
        // Strict baseline validation constraint check
        if (currentSenderBalance - amount < -maxNegativeLimit) {
            throw new Error(`Transaction rejected. Exceeds Maximum Negative Balance Limit (-${maxNegativeLimit} CMN).`);
        }

        // Execute accounting shift (0% interest engine)
        this.balances[senderId] -= amount;
        this.balances[receiverId] += amount;

        return {
            status: "SUCCESS",
            senderBalance: this.balances[senderId],
            receiverBalance: this.balances[receiverId]
        };
    }

    /**
     * Default Absorption Engine
     * If an individual abandons the network while negative, the loss is automatically 
     * distributed back to the peers who vouched for them.
     */
    processDefault(defaultedUserId) {
        const balance = this.balances[defaultedUserId];
        if (balance >= 0) return { outcome: "Account holds no systemic debt liabilities." };

        const totalSystemicDebt = Math.abs(balance);
        const backingVouchers = this.vouchers[defaultedUserId];
        const totalVouchVolume = Object.values(backingVouchers).reduce((sum, val) => sum + val, 0);

        if (totalVouchVolume === 0) {
            throw new Error("Systemic error: Negative account balance exists without backing trust vectors.");
        }

        // Proportional liability absorption routine
        for (const voucherId in backingVouchers) {
            const vouchContribution = backingVouchers[voucherId];
            const liabilityRatio = vouchContribution / totalVouchVolume;
            const absoluteLossShare = totalSystemicDebt * liabilityRatio;

            // Deduct the loss share directly from the voucher's balance
            this.balances[voucherId] -= absoluteLossShare;
            
            // Dissolve the broken trust linkage
            delete this.vouches[voucherId][defaultedUserId];
        }

        // Reset defaulted account to structural balance zero
        this.balances[defaultedUserId] = 0;
        this.vouchers[defaultedUserId] = {};

        return { outcome: "Debt successfully absorbed by backing trust ecosystem topology." };
    }
}

export default NexusTrustMesh;
