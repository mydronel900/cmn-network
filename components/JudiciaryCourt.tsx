'use client';
import React, { useState } from 'react';

export default function JudiciaryCourt() {
  const [slashed, setSlashed] = useState(false);

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-zinc-950 border border-red-500/20 rounded-2xl text-zinc-100 shadow-2xl shadow-red-950/10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-zinc-800 pb-6 mb-6 gap-4">
        <div>
          <h2 className="text-sm font-semibold tracking-wider text-red-400 uppercase">Stage 5 Consensus Judiciary</h2>
          <h1 className="text-2xl font-bold tracking-tight">Dispute Resolution & Slashing</h1>
        </div>
        <div className="bg-red-950/30 border border-red-500/20 px-4 py-2 rounded-xl text-right">
          <p className="text-xs text-zinc-400">Total Escalated Stake</p>
          <p className="text-lg font-mono font-bold text-red-400">$380,000 CMN</p>
        </div>
      </div>
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider">
              Under Challenge
            </span>
            <h3 className="text-lg font-bold mt-2">Case #8842: Hardware Telemetry Discrepancy</h3>
          </div>
          <span className="text-xs font-mono text-zinc-500">Epoch: 402</span>
        </div>
        <p className="text-sm text-zinc-400 leading-relaxed mb-4">
          An automated oracle node reported a 45% crop loss on Node-Alpha, while the local hardware signature telemetry indicated normal operational outputs. Malicious report or hardware spoofing suspected.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-zinc-950 p-4 rounded-xl border border-zinc-900 text-xs mb-6">
          <div>
            <p className="text-zinc-500 mb-1">Accused Node</p>
            <p className="font-mono text-zinc-300 truncate">0x71C...8ae9 (Oracle-A)</p>
          </div>
          <div>
            <p className="text-zinc-500 mb-1">Staked Collateral</p>
            <p className="font-mono text-red-400 font-bold">120,000 CMN</p>
          </div>
          <div>
            <p className="text-zinc-500 mb-1">Consensus Deadline</p>
            <p className="font-mono text-zinc-300">2h 14m remaining</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button 
            onClick={() => setSlashed(true)}
            disabled={slashed}
            className={`flex-1 px-6 py-3 font-bold rounded-xl text-sm tracking-wide transition-all ${
              slashed 
                ? 'bg-zinc-900 border border-zinc-800 text-zinc-600 cursor-not-allowed' 
                : 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/10 active:scale-98'
            }`}
          >
            {slashed ? '🚨 Malice Slashed! Capital Diverted to Stage 6 Pool' : '⚖️ Vote to Slash (Malicious Submissions)'}
          </button>
        </div>
      </div>
    </div>
  );
}
