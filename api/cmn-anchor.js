/**
 * CMN Core Engine Module: Decentralized Fiat Anchor Gateway
 * Manages off-chain fiat validation mappings and translates them into mesh trust vouchers.
 */

import RWAOracleNetwork from './cmn-oracle.js';
import NexusTrustMesh from './cmn-trust-mesh.js';
import CMNClearingEngine from './cmn-clearing.js';
import CMNStorageManager from './cmn-storage.js';

export default class CMNAnchorGateway {
    constructor(anchorNodeId, supportedFiat = 'USD') {
        this.anchorNodeId = anchorNodeId;
        this.supportedFiat = supportedFiat;
        this.storage = new CMNStorageManager();
    }

    /**
     * Processes a verified off-chain fiat payment notification
     * Translates fiat value to CMN tokens via real-time Oracle price indices and provisions mesh liquidity.
     */
    async processFiatDeposit(targetNodeId, fiatAmount, fiatTxReference) {
        const oracle = new RWAOracleNetwork();
        const trustMesh = new NexusTrustMesh();
        const clearing = new CMNClearingEngine(trustMesh);

        try {
            // 1. Rehydrate current system ledger state
            this.storage.rehydrate(trustMesh, oracle, clearing);

            // 2. Fetch absolute asset price weight index via the correct method
            const currentCmnPriceUSD = oracle.calculateParityIndex();
            
            // Convert fiat volume into target CMN token volume
            const cmnVolumeToIssue = parseFloat((fiatAmount / currentCmnPriceUSD).toFixed(2));

            console.log(`\n📥 [ANCHOR ENGINE] Processing Fiat Deposit Event:`);
            console.log(`   ➔ Ref: ${fiatTxReference} | Amount: ${fiatAmount} ${this.supportedFiat}`);
            console.log(`   ➔ Oracle CMN Parity Rate: $${currentCmnPriceUSD.toFixed(2)} USD`);
            console.log(`   ➔ Target Allocation: ${cmnVolumeToIssue} CMN`);

            // 3. Provision local liquidity: Anchor extends a highly rated mutual credit trustline to target node
            if (!trustMesh.vouchers[this.anchorNodeId]) {
                trustMesh.vouchers[this.anchorNodeId] = {};
            }

            // Establish or add to the current clearing voucher threshold allocation
            const currentVoucherLimit = trustMesh.vouchers[this.anchorNodeId][targetNodeId] || 0;
            trustMesh.vouchers[this.anchorNodeId][targetNodeId] = currentVoucherLimit + cmnVolumeToIssue;

            // Seed direct base clearing token balance to verify allocation
            const currentBalance = trustMesh.balances[targetNodeId] || 0;
            trustMesh.balances[targetNodeId] = currentBalance + cmnVolumeToIssue;

            // 4. Update the Anchor's local tracking state to preserve ledger tracking records
            if (!trustMesh.balances[this.anchorNodeId]) {
                trustMesh.balances[this.anchorNodeId] = 0;
            }

            // Save modifications back to the local database file system storage layer
            this.storage.persist(trustMesh, oracle, clearing);

            console.log(`✨ [ANCHOR SEED COMPLETE] Node '${targetNodeId}' liquid allocation successfully expanded.`);
            return {
                success: true,
                issuedTokens: cmnVolumeToIssue,
                newBalance: trustMesh.balances[targetNodeId]
            };

        } catch (err) {
            console.error("❌ [ANCHOR EXCEPTION] Gateway transaction failed:", err.message);
            return { success: false, error: err.message };
        }
    }
}
