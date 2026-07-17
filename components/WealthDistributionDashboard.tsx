'use client';
import React, { useState, useEffect } from 'react';

export default function WealthDistributionDashboard() {
  // Simulating the dynamic sub-second drift of the Global Social Dividend
  const [dividend, setDividend] = useState(42.895123);
  const [globalPool, setGlobalPool] = useState(1420968432.20);

  useEffect(() => {
    const interval = setInterval(() => {
      setDividend((prev) => prev + 0.000124);
      setGlobalPool((prev) => prev + 1.85);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-zinc-950 border border-emerald-500/30 rounded-2xl text-zinc-100 shadow-2xl shadow-emerald-950/20">
      
      {/* Header Block */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-zinc-800 pb-6 mb-6 gap-4">
        <div>
          <h2 className="text-sm font-semibold tracking-wider text-emerald-400 uppercase">Stage 6 Macro Engine</h2>
          <h1 className="text-2xl font-bold tracking-tight">Systemic Wealth Redistribution</h1>
        </div>
        <div className="bg-emerald-950/50 border border-emerald-500/20 px-4 py-2 rounded-xl text-right">
          <p className="text-xs text-zinc-400">Global Community Sink Pool</p>
          <p className="text-lg font-mono font-bold text-emerald-400">
            ${globalPool.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} CMN
          </p>
        </div>
      </div>

      {/* Primary Dividend Hook */}
      <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-xl p-6 mb-6 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="w-full text-center md:text-left">
          <p className="text-sm text-zinc-400 font-medium">Your Real-Time Social Dividend</p>
          <p className="text-4xl font-mono font-black text-white tracking-tight mt-1">
            +${dividend.toFixed(6)} <span className="text-xs text-emerald-400 font-normal animate-pulse">CMN</span>
          </p>
          <p className="text-xs text-zinc-500 mt-2">Funded continuously via systemic transaction demurrage & court asset slashing.</p>
        </div>
        <button className="w-full md:w-auto px-8 py-4 bg-emerald-500 hover:bg-emerald-400 active:scale-98 text-zinc-950 font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/10">
          Claim Social Dividend
        </button>
      </div>

      {/* System Health / Anti-Whale Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Anti-Whale Guard */}
        <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2">
            🛡️ Anti-Whale Status
          </h3>
          <ul className="space-y-2 text-xs">
            <li className="flex justify-between"><span className="text-zinc-500">Systemic Gini Coefficient:</span> <span className="font-mono text-emerald-400 font-bold">0.12 (Flat)</span></li>
            <li className="flex justify-between"><span className="text-zinc-500">Max Wallet Capacity Limit:</span> <span className="font-mono text-zinc-300">0.05% of Pool</span></li>
            <li className="flex justify-between"><span className="text-zinc-500">Active Capital Fragmentation:</span> <span className="font-mono text-emerald-500">Triggered (0 wallets exceeding)</span></li>
          </ul>
        </div>

        {/* Network Metrics */}
        <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2">
            📉 Distribution Velocity
          </h3>
          <ul className="space-y-2 text-xs">
            <li className="flex justify-between"><span className="text-zinc-500">Demurrage Recycle Rate:</span> <span className="font-mono text-zinc-300">2.5% annually on static funds</span></li>
            <li className="flex justify-between"><span className="text-zinc-500">Cooperative Equity Flow:</span> <span className="font-mono text-emerald-400 font-bold">40% to creators directly</span></li>
            <li className="flex justify-between"><span className="text-zinc-500">Judiciary Reclaimed Inflow:</span> <span className="font-mono text-zinc-300">+$82,410 CMN this epoch</span></li>
          </ul>
        </div>
      </div>

    </div>
  );
}
