class NexusTrustMesh {
    constructor() {
        this.balances = {};
        this.vouches = {};
        this.vouchers = {};
        this.coopAllocations = {};
    }
    initializeAccount(userId, initialBalance = 0) {
        // Strict evaluation protects zero-balances from being overwritten
        if (this.balances[userId] === undefined) {
            this.balances[userId] = initialBalance;
            this.vouches[userId] = {};
            this.vouchers[userId] = {};
        }
    }
    addPeerVouch(voucherId, vaucheeId, amount) {
        if (voucherId === vaucheeId) throw new Error("Self-vouching validation fault.");
        this.initializeAccount(voucherId);
        this.initializeAccount(vaucheeId);
        this.vouches[voucherId][vaucheeId] = amount;
        this.vouchers[vaucheeId][voucherId] = amount;
        return { voucher: voucherId, vauchee: vaucheeId, limitExtended: amount };
    }
    calculateMaxNegativeLimit(userId) {
        this.initializeAccount(userId);
        const peerTrustVectors = Object.values(this.vouchers[userId]);
        return peerTrustVectors.reduce((sum, amt) => sum + amt, 0);
    }
    executeTransaction(senderId, receiverId, amount) {
        this.initializeAccount(senderId);
        this.initializeAccount(receiverId);
        const maxNegativeLimit = this.calculateMaxNegativeLimit(senderId);
        if (this.balances[senderId] - amount < -maxNegativeLimit) {
            throw new Error(`Transaction rejected. Exceeds limit (-${maxNegativeLimit} CMN).`);
        }
        this.balances[senderId] -= amount;
        this.balances[receiverId] += amount;
        return { status: "SUCCESS", senderBalance: this.balances[senderId], receiverBalance: this.balances[receiverId] };
    }
    processDefault(defaultedUserId) {
        const balance = this.balances[defaultedUserId];
        if (balance >= 0) return { outcome: "No debt." };
        const totalSystemicDebt = Math.abs(balance);
        const backingVouchers = this.vouchers[defaultedUserId];
        const totalVouchVolume = Object.values(backingVouchers).reduce((sum, val) => sum + val, 0);
        for (const voucherId in backingVouchers) {
            this.balances[voucherId] -= totalSystemicDebt * (backingVouchers[voucherId] / totalVouchVolume);
            delete this.vouches[voucherId][defaultedUserId];
        }
        this.balances[defaultedUserId] = 0;
        this.vouchers[defaultedUserId] = {};
        return { outcome: "Debt successfully absorbed by backing trust topology." };
    }
}
export default NexusTrustMesh;
