'use client';
import React, { useState } from 'react';
import CyberneticMediaEngine from '../components/CyberneticMediaEngine';
import AssetBackedCreditRequest from '../components/AssetBackedCreditRequest';
import OracleTelemetry from '../components/OracleTelemetry';
import JudiciaryCourt from '../components/JudiciaryCourt';
import WealthDistributionDashboard from '../components/WealthDistributionDashboard';

export default function MainPortal() {
  const [activeTab, setActiveTab] = useState('rebalancing');

  return (
    <div className="flex min-h-screen bg-zinc-900 text-zinc-100 antialiased selection:bg-emerald-500/30">
      
      {/* Consumer Portal Sidebar */}
      <aside className="w-64 bg-zinc-950 border-r border-zinc-800/80 flex flex-col justify-between p-4 shrink-0 select-none">
        <div className="space-y-6">
          <div className="px-2 py-3 border-b border-zinc-800/60">
            <span className="text-xl font-black tracking-wider text-white">CMN <span className="text-emerald-400">NETWORK</span></span>
            <p className="text-[10px] text-zinc-500 tracking-widest uppercase mt-0.5 font-semibold">Consumer Portal v1.0</p>
          </div>

          <nav className="space-y-1">
            <div className="px-4 pb-2 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Network Core</div>
            <button 
              onClick={() => setActiveTab('media')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'media' 
                  ? 'bg-fuchsia-950/40 text-fuchsia-400 border border-fuchsia-500/20 font-semibold' 
                  : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 border border-transparent'
              }`}
            >
              🎬 Cybernetic Media
            </button>
            <button 
              onClick={() => setActiveTab('credit')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'credit' 
                  ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/20 font-semibold' 
                  : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 border border-transparent'
              }`}
            >
              💳 Credit Matrix
            </button>
            <button 
              onClick={() => setActiveTab('oracle')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'oracle' 
                  ? 'bg-cyan-950/40 text-cyan-400 border border-cyan-500/20 font-semibold' 
                  : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 border border-transparent'
              }`}
            >
              🔮 Oracle Telemetry
            </button>
            <button 
              onClick={() => setActiveTab('judiciary')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'judiciary' 
                  ? 'bg-red-950/30 text-red-400 border border-red-500/20 font-semibold' 
                  : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 border border-transparent'
              }`}
            >
              ⚖️ Judiciary Court
            </button>
            
            <div className="pt-5 px-4 pb-2 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Macro Balancing</div>
            <button 
              onClick={() => setActiveTab('rebalancing')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'rebalancing' 
                  ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/20 font-semibold' 
                  : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 border border-transparent'
              }`}
            >
              🌊 Macro Rebalancing
            </button>
          </nav>
        </div>

        <div className="p-2 border-t border-zinc-800/60 text-[10px] text-zinc-500 font-mono flex justify-between items-center">
          <span>Target: vercel-dev</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        </div>
      </aside>

      {/* Main Display Port */}
      <main className="flex-1 p-8 overflow-y-auto bg-gradient-to-b from-zinc-900 to-zinc-950 flex items-center justify-center">
        {activeTab === 'media' && <CyberneticMediaEngine />}
        {activeTab === 'rebalancing' && <WealthDistributionDashboard />}
        {activeTab === 'credit' && <AssetBackedCreditRequest />}
        {activeTab === 'oracle' && <OracleTelemetry />}
        {activeTab === 'judiciary' && <JudiciaryCourt />}
      </main>

    </div>
  );
}
