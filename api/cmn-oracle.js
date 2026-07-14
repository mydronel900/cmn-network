/**
 * CMN Multi-Layered RWA Oracle Network
 * Architectural Layer: DGEA Core Framework
 */

class RWAOracleNetwork {
    constructor() {
        // System Basket Weights as defined in the DGEA Blueprint
        this.weights = {
            productiveLand: 0.30,      // 30% weighting
            renewableEnergy: 0.30,     // 30% weighting
            vitalCommodities: 0.20,    // 20% weighting
            digitalInfrastructure: 0.20 // 20% weighting
        };

        // Internal State Engine Tracking
        this.registry = {
            productiveLand: { valueUSD: 0, appraisals: {} },
            renewableEnergy: { valueUSD: 0, iotDevices: {} },
            vitalCommodities: { valueUSD: 0, feeds: {} },
            digitalInfrastructure: { valueUSD: 0, nodes: {} }
        };

        this.MINIMUM_APPRAISER_STAKE = 1000; // Minimum CMN required to validate land assets
    }

    /**
     * TIER 1: API Aggregators (Vital Commodities)
     * Direct data ingest from decentralized nodes or market spot prices
     */
    updateCommodityPrice(feedId, rawPriceUSD) {
        if (rawPriceUSD <= 0) return;
        this.registry.vitalCommodities.feeds[feedId] = rawPriceUSD;
        
        // Calculate the mathematical mean of all trusted market feeds
        const feeds = Object.values(this.registry.vitalCommodities.feeds);
        const total = feeds.reduce((sum, price) => sum + price, 0);
        this.registry.vitalCommodities.valueUSD = total / feeds.length;
        
        return this.registry.vitalCommodities.valueUSD;
    }

    /**
     * TIER 2: Asynchronous Optimistic Appraisals (Productive Land)
     * Human evaluation mechanism bound by game-theoretic economic penalties
     */
    submitLandAppraisal(assetId, appraiserId, appraisedValueUSD, stakedCMN) {
        if (stakedCMN < this.MINIMUM_APPRAISER_STAKE) {
            throw new Error(`Appraisal rejected. Insufficient security stake. Minimum: ${this.MINIMUM_APPRAISER_STAKE} CMN.`);
        }

        this.registry.productiveLand.appraisals[assetId] = {
            valueUSD: appraisedValueUSD,
            appraiser: appraiserId,
            stake: stakedCMN,
            timestamp: Date.now(),
            status: "PENDING_DISPUTE_WINDOW"
        };

        // Set baseline value assuming honesty; corrected if challenged
        this.registry.productiveLand.valueUSD = appraisedValueUSD;
        return this.registry.productiveLand.appraisals[assetId];
    }

    /**
     * Slasher Mechanism: Executed if an appraiser attempts to falsify asset value
     */
    triggerAppraiserSlash(assetId, challengerId, isFraudulent) {
        const appraisal = this.registry.productiveLand.appraisals[assetId];
        if (!appraisal) throw new Error("Target appraisal record not found.");

        if (isFraudulent) {
            appraisal.status = "SLASHED_FRAUD";
            const forfeitedStake = appraisal.stake;
            appraisal.stake = 0;
            this.registry.productiveLand.valueUSD = 0; // Reset asset worth until re-appraised
            
            return {
                outcome: "Appraiser slashed. Stake permanently burned to preserve ecosystem balance.",
                burnedAmount: forfeitedStake
            };
        }

        appraisal.status = "VERIFIED_VALID";
        return { outcome: "Appraisal challenge dismissed. Valuation confirmed." };
    }

    /**
     * TIER 3: Hardware Verification & IoT Oracle Core (Energy & Compute Infrastructure)
     * Direct mathematical telemetry tracking true real-world utility output
     */
    updateHardwareTelemetry(infrastructureType, deviceId, currentOutputMetric) {
        // infrastructureType must be 'renewableEnergy' (MWh) or 'digitalInfrastructure' (Flops/Gb)
        if (!this.registry[infrastructureType]) throw new Error("Invalid hardware infrastructure type.");
        
        const targetCategory = this.registry[infrastructureType];
        targetCategory.iotDevices[deviceId] = currentOutputMetric;

        // Dynamic formula converting structural physical capacity straight into asset value
        const devices = Object.values(targetCategory.iotDevices);
        const aggregateOutput = devices.reduce((sum, metric) => sum + metric, 0);
        
        // Value mapping multiplier based on clean energy utility and bare-metal compute capacity
        const conversionMultiplier = infrastructureType === 'renewableEnergy' ? 150 : 250;
        targetCategory.valueUSD = aggregateOutput * conversionMultiplier;

        return targetCategory.valueUSD;
    }

    /**
     * The Definitive Index Aggregator
     * Computes the weighted valuation mathematically generating the baseline price of 1 CMN
     */
    getCalculatedIndexParity() {
        const landContribution = this.registry.productiveLand.valueUSD * this.weights.productiveLand;
        const energyContribution = this.registry.renewableEnergy.valueUSD * this.weights.renewableEnergy;
        const commodityContribution = this.registry.vitalCommodities.valueUSD * this.weights.vitalCommodities;
        const infraContribution = this.registry.digitalInfrastructure.valueUSD * this.weights.digitalInfrastructure;

        const baseIndexValue = landContribution + energyContribution + commodityContribution + infraContribution;
        
        // Return structured global architecture data object
        return {
            cmnParityUSD: baseIndexValue,
            breakdown: {
                land: landContribution,
                energy: energyContribution,
                commodities: commodityContribution,
                infrastructure: infraContribution
            },
            timestamp: Date.now()
        };
    }
}

export default RWAOracleNetwork;
