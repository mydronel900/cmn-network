'use client';
import React from 'react';

export default function AssetBackedCreditRequest() {
  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-zinc-950 border border-emerald-500/30 rounded-2xl text-zinc-100 shadow-2xl shadow-emerald-950/20">
      <div className="border-b border-zinc-800 pb-6 mb-6">
        <h2 className="text-sm font-semibold tracking-wider text-emerald-400 uppercase">Stage 2 Credit Matrix</h2>
        <h1 className="text-2xl font-bold tracking-tight">Asset-Backed Credit Request</h1>
      </div>
      <div className="space-y-6">
        <div>
          <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Select Collateral Asset</label>
          <select className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-zinc-100 focus:outline-none focus:border-emerald-500/50 cursor-pointer">
            <option>Tokenized Local Agriculture Yield (RWA)</option>
            <option>Hardware Telemetry Collateral (PoH)</option>
            <option>Community Land Trust Equity</option>
          </select>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Appraised Asset Value ($)</label>
            <input type="number" placeholder="50,000" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-zinc-100 focus:outline-none focus:border-emerald-500/50 font-mono" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Requested Credit Line (CMN)</label>
            <input type="number" placeholder="25,000" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-zinc-100 focus:outline-none focus:border-emerald-500/50 font-mono" />
          </div>
        </div>
        <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl text-xs text-zinc-400 space-y-2">
          <div className="flex justify-between"><span>Collateralization Ratio:</span> <span className="font-mono text-zinc-200">150%</span></div>
          <div className="flex justify-between"><span>Automated Interest Rate:</span> <span className="font-mono text-emerald-400">0% (Systemic Non-Usury)</span></div>
          <div className="flex justify-between"><span>Oracle Appraisal Confidence:</span> <span className="font-mono text-emerald-500">98.4% Verified</span></div>
        </div>
        <button className="w-full px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/10 active:scale-98">
          Initialize Credit Protocol
        </button>
      </div>
    </div>
  );
}
