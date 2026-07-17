'use client';
import React from 'react';

export default function CyberneticMediaEngine() {
  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-zinc-950 border border-fuchsia-500/20 rounded-2xl text-zinc-100 shadow-2xl shadow-fuchsia-950/10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-zinc-800 pb-6 mb-6 gap-4">
        <div>
          <h2 className="text-sm font-semibold tracking-wider text-fuchsia-400 uppercase">Stage 1 Ingress Core</h2>
          <h1 className="text-2xl font-bold tracking-tight">Cybernetic Media Studio</h1>
        </div>
        <div className="bg-fuchsia-950/30 border border-fuchsia-500/20 px-4 py-2 rounded-xl text-right">
          <p className="text-xs text-zinc-400">Network Attention Bandwidth</p>
          <p className="text-lg font-mono font-bold text-fuchsia-400">4.8M Epoch-Views</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="md:col-span-2 bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-5 flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-zinc-200">Broadcast Campaign Dispatch</h3>
            <p className="text-xs text-zinc-500 mt-1">Convert real-world project growth metrics directly into interactive, social content hooks.</p>
          </div>
          <textarea 
            placeholder="Announce the Co-Op Zone Alpha hardware harvest telemetry yield up by 12% across decentralized community streams..." 
            className="w-full h-24 bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-300 focus:outline-none focus:border-fuchsia-500/50 resize-none"
          />
          <button className="w-full py-3 bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-fuchsia-600/10 active:scale-98">
            Deploy Decentrally to Attestation Feeds
          </button>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-zinc-200 mb-3">On-Chain Attention Value</h3>
            <ul className="space-y-3 text-xs">
              <li className="flex justify-between"><span className="text-zinc-500">Reputation Sink:</span> <span className="font-mono text-zinc-300">+14.2 Rank</span></li>
              <li className="flex justify-between"><span className="text-zinc-500">Media Gas Cost:</span> <span className="font-mono text-emerald-400 font-medium">0.00 CMN</span></li>
              <li className="flex justify-between"><span className="text-zinc-500">Viral Coefficient:</span> <span className="font-mono text-fuchsia-400 font-bold">1.4x</span></li>
            </ul>
          </div>
          <div className="p-3 bg-zinc-950 border border-zinc-900 rounded-lg text-[10px] text-zinc-500 leading-relaxed font-mono">
            Captured attention automatically stakes dynamic credit eligibility variables directly in Stage 2.
          </div>
        </div>
      </div>
    </div>
  );
}
