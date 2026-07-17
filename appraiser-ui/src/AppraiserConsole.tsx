import React, { useState, useEffect, useRef } from 'react';

type AppraiserStatus = 'NonExistent' | 'Active' | 'Suspended' | 'Blacklisted';

interface AssetPayload {
  id: number;
  name: string;
  location: string;
  claimedValue: number;
}

const MIN_STAKE = 100000;
const VESTING_DURATION_SECONDS = 365 * 24 * 60 * 60; // 1 Year
const FEE_BPS = 250; // 2.5%

export default function AppraiserConsole() {
  const [status, setStatus] = useState<AppraiserStatus>('NonExistent');
  const [trustRating, setTrustRating] = useState<number>(10000);
  const [cmnBalance, setCmnBalance] = useState<number>(250000);
  const [isTxLoading, setIsTxLoading] = useState<boolean>(false);
  
  const [activeAsset, setActiveAsset] = useState<AssetPayload | null>({
    id: 7402,
    name: "50kW Community Solar Grid",
    location: "Nairobi, Kenya",
    claimedValue: 100000
  });

  const [totalFeeAllocated, setTotalFeeAllocated] = useState<number>(0);
  const [amountClaimed, setAmountClaimed] = useState<number>(0);
  const [vestingStartTime, setVestingStartTime] = useState<number>(0);
  const [liveVestedDisplay, setLiveVestedDisplay] = useState<number>(0);
  const dripIntervalRef = useRef<any>(null);

  const handleActivateNode = async () => {
    setIsTxLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 2500));
      setCmnBalance(prev => prev - MIN_STAKE);
      setStatus('Active');
      setTrustRating(10000);
    } catch (error) {
      console.error(error);
    } finally {
      setIsTxLoading(false);
    }
  };

  const handleCertifyValuation = async () => {
    if (!activeAsset) return;
    setIsTxLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      const calculatedFee = (activeAsset.claimedValue * FEE_BPS) / 10000;
      setTotalFeeAllocated(calculatedFee);
      setVestingStartTime(Date.now());
      setAmountClaimed(0);
      setActiveAsset(null);
    } catch (error) {
      console.error(error);
    } finally {
      setIsTxLoading(false);
    }
  };

  useEffect(() => {
    if (totalFeeAllocated > 0 && status === 'Active') {
      dripIntervalRef.current = window.setInterval(() => {
        const timeElapsedSeconds = (Date.now() - vestingStartTime) / 1000;
        
        if (timeElapsedSeconds >= VESTING_DURATION_SECONDS) {
          setLiveVestedDisplay(totalFeeAllocated - amountClaimed);
          if (dripIntervalRef.current) clearInterval(dripIntervalRef.current);
        } else {
          const totalVestedAccumulated = (totalFeeAllocated * timeElapsedSeconds) / VESTING_DURATION_SECONDS;
          const claimableNow = totalVestedAccumulated - amountClaimed;
          setLiveVestedDisplay(claimableNow > 0 ? claimableNow : 0);
        }
      }, 1000);
    }

    return () => {
      if (dripIntervalRef.current) clearInterval(dripIntervalRef.current);
    };
  }, [totalFeeAllocated, vestingStartTime, amountClaimed, status]);

  const handleHarvestFees = async () => {
    if (liveVestedDisplay <= 0) return;
    setIsTxLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1800));
      const harvestedAmount = liveVestedDisplay;
      setAmountClaimed(prev => prev + harvestedAmount);
      setCmnBalance(prev => prev + harvestedAmount);
      setLiveVestedDisplay(0);
      if (navigator.vibrate) navigator.vibrate(15);
    } catch (error) {
      console.error(error);
    } finally {
      setIsTxLoading(false);
    }
  };

  const simulateSlashing = () => {
    setStatus('Blacklisted');
    setTrustRating(0);
    setLiveVestedDisplay(0);
    setTotalFeeAllocated(0);
  };

  if (status === 'Blacklisted') {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-6 font-sans select-none animate-fade-in">
        <div className="w-full max-w-xl border border-red-900/50 bg-gradient-to-b from-red-950/30 to-neutral-950 p-8 rounded-2xl relative overflow-hidden backdrop-blur-md shadow-2xl shadow-red-950/20">
          <div className="absolute top-0 left-0 w-full h-1 bg-red-600 animate-pulse" />
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="w-16 h-16 bg-red-900/20 border border-red-500/30 rounded-full flex items-center justify-center text-red-500">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-red-400 font-mono">NODE LIQUIDATION TRIGGERED</h1>
            <p className="text-sm text-neutral-400 leading-relaxed font-mono bg-black/40 border border-neutral-900 rounded-lg p-4 w-full">
              Equivocation / Fraud Proof detected on Asset #7402. Your initial stake of 100,000 CMN has been burned.
            </p>
            <div className="w-full border border-neutral-900/80 bg-neutral-950/60 p-6 rounded-xl flex justify-between items-center relative group opacity-50">
              <div className="flex flex-col items-start space-y-1">
                <span className="text-xs uppercase tracking-widest text-neutral-500 font-mono">Locked Active Stake</span>
                <span className="text-2xl font-semibold text-neutral-600 font-mono line-through tracking-tight">100,000.00 CMN</span>
              </div>
              <div className="absolute right-6 top-6 text-neutral-600 animate-pulse">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>
            <button disabled className="w-full py-4 bg-neutral-900 border border-neutral-800 text-neutral-600 rounded-xl font-medium cursor-not-allowed font-mono">
              Access Revoked — Identity Suspended
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-8 font-sans antialiased selection:bg-emerald-500/20">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center border-b border-neutral-900 pb-6 mb-8 gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight font-mono text-neutral-200">CMN // APPRAISER.CONSOLE</h1>
          <p className="text-xs text-neutral-500 mt-1 font-mono">DID: {status === 'Active' ? 'auth_node_0x82...f3a9' : 'Unregistered Node'}</p>
        </div>
        <div className="flex gap-6 text-sm font-mono">
          <div className="flex flex-col items-end">
            <span className="text-neutral-500 text-xs uppercase tracking-wider">Wallet Balance</span>
            {/* High-Precision Decimal Fix applied below: updated maximumFractionDigits to 6 */}
            <span className="text-base font-medium text-neutral-300">{cmnBalance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 6})} CMN</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-neutral-500 text-xs uppercase tracking-wider">Node Trust Index</span>
            <span className={`text-base font-medium ${(trustRating / 100) === 100 ? 'text-emerald-400' : 'text-neutral-400'}`}>{(trustRating / 100).toFixed(2)}%</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
        <div className="border border-neutral-900 bg-neutral-950 p-6 rounded-2xl flex flex-col justify-between space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-semibold uppercase tracking-wider font-mono text-neutral-400">1. Staking Activation</h2>
              <span className={`h-2 w-2 rounded-full ${status === 'Active' ? 'bg-emerald-400 shadow-md shadow-emerald-400/50' : 'bg-neutral-700'}`} />
            </div>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Appraisers must commit a standard collateral reserve to guarantee accuracy. Reclaiming requires a 14-day formal exit window.
            </p>
          </div>
          <div className="border border-neutral-900/60 bg-neutral-900/30 p-4 rounded-xl flex justify-between items-center">
            <div className="flex flex-col">
              <span className="text-xs text-neutral-500 font-mono uppercase">Required Stake</span>
              <span className="text-lg font-semibold tracking-tight font-mono text-neutral-300">100,000 CMN</span>
            </div>
            <button
              onClick={handleActivateNode}
              disabled={status === 'Active' || isTxLoading}
              className={`px-4 py-2.5 rounded-lg text-xs font-semibold font-mono border transition-all duration-200 ${
                status === 'Active'
                  ? 'bg-neutral-900 border-neutral-800 text-neutral-500 cursor-default'
                  : 'bg-neutral-100 text-black border-white hover:bg-neutral-200 active:scale-95'
              }`}
            >
              {isTxLoading && status === 'NonExistent' ? 'Enclave Verification...' : status === 'Active' ? 'Node Active' : 'Activate Node'}
            </button>
          </div>
        </div>

        <div className="border border-neutral-900 bg-neutral-950 p-6 rounded-2xl flex flex-col justify-between space-y-6">
          <div className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider font-mono text-neutral-400">2. Evaluation Pipeline</h2>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Verify incoming multi-spectral physical telemetry feeds. Sign the encrypted validation packet to mint local ecosystem asset credit pools.
            </p>
          </div>
          {activeAsset && status === 'Active' ? (
            <div className="border border-neutral-900/80 bg-neutral-900/20 p-4 rounded-xl space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-medium text-neutral-300 font-mono">Asset #{activeAsset.id}</h3>
                  <p className="text-xs text-neutral-500 font-mono mt-0.5">{activeAsset.name} — {activeAsset.location}</p>
                </div>
                <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Pending</span>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 bg-neutral-900 border border-neutral-800/80 p-2.5 rounded text-left font-mono text-xs">
                  <span className="text-[10px] text-neutral-500 block uppercase">Telemetry Evaluation</span>
                  <span className="text-neutral-300 font-semibold">${activeAsset.claimedValue.toLocaleString()} USD</span>
                </div>
                <button
                  onClick={handleCertifyValuation}
                  disabled={isTxLoading}
                  className="bg-emerald-500 hover:bg-emerald-600 text-black px-4 rounded-lg text-xs font-semibold font-mono border border-emerald-400 active:scale-95 transition-transform"
                >
                  {isTxLoading ? 'Signing...' : 'Certify'}
                </button>
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-neutral-900 bg-neutral-950/40 p-6 rounded-xl text-center flex items-center justify-center">
              <span className="text-xs text-neutral-600 font-mono">
                {status !== 'Active' ? 'Activate node to clear queue' : 'Pipeline Queue Clean (0 Assets)'}
              </span>
            </div>
          )}
        </div>

        <div className="border border-neutral-900 bg-neutral-950 p-6 rounded-2xl flex flex-col justify-between space-y-6">
          <div className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider font-mono text-neutral-400">3. Vested Micro-Fee Drip</h2>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Fees accrue dynamically across our 12-month alignment arc. Watch real-time stream execution straight from disk vaults.
            </p>
          </div>
          <div className="space-y-3">
            <div className="bg-neutral-900/40 border border-neutral-900 p-4 rounded-xl space-y-2">
              <div className="flex justify-between text-xs font-mono text-neutral-500">
                <span>Vested & Claimable</span>
                <span>Total Fee Allocated: {totalFeeAllocated} CMN</span>
              </div>
              <div className="text-2xl font-bold font-mono text-neutral-200 tracking-tight select-all tabular-nums">
                +{liveVestedDisplay.toFixed(6)} <span className="text-xs text-emerald-400 font-normal">CMN</span>
              </div>
            </div>
            <button
              onClick={handleHarvestFees}
              disabled={liveVestedDisplay === 0 || isTxLoading}
              className={`w-full py-3 rounded-xl text-xs font-semibold font-mono border transition-all duration-200 ${
                liveVestedDisplay > 0 && !isTxLoading
                  ? 'bg-emerald-500 text-black border-emerald-400 hover:bg-emerald-600 active:scale-[0.98]'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-600 cursor-not-allowed'
              }`}
            >
              {isTxLoading ? 'Processing Passkey Sign...' : 'Harvest Vested Fees'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto mt-12 pt-6 border-t border-neutral-900/60 flex justify-between items-center text-xs font-mono text-neutral-600">
        <span>Environment Protocol Verification Simulator</span>
        <button 
          onClick={simulateSlashing}
          className="text-neutral-600 hover:text-red-400 transition-colors border border-dashed border-neutral-900 hover:border-red-900/50 px-3 py-1 rounded"
        >
          Force Global Slashing Event
        </button>
      </div>
    </div>
  );
}
