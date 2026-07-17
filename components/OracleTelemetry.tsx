'use client';
import React, { useState, useEffect } from 'react';

export default function OracleTelemetry() {
  const [telemetry, setTelemetry] = useState({
    yieldConfidence: 98.4,
    moisture: 64.2,
    hardwareProof: '0x9f83...2a11',
    networkLatency: 14
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setTelemetry(prev => ({
        yieldConfidence: +(prev.yieldConfidence + (Math.random() - 0.5) * 0.1).toFixed(2),
        moisture: +(prev.moisture + (Math.random() - 0.5) * 0.3).toFixed(1),
        hardwareProof: Math.random() > 0.5 ? '0x9f83...2a11' : '0x3e12...7b89',
        networkLatency: Math.floor(Math.random() * 5) + 11
      }));
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-zinc-950 border border-cyan-500/20 rounded-2xl text-zinc-100 shadow-2xl shadow-cyan-950/10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-zinc-800 pb-6 mb-6 gap-4">
        <div>
          <h2 className="text-sm font-semibold tracking-wider text-cyan-400 uppercase">Stage 3 RWA Attestation</h2>
          <h1 className="text-2xl font-bold tracking-tight">Oracle Telemetry Streams</h1>
        </div>
        <div className="flex items-center gap-2 bg-cyan-950/30 border border-cyan-500/20 px-4 py-2 rounded-xl">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
          <p className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest">Live Feed</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl">
          <p className="text-xs text-zinc-500 font-medium uppercase">Appraisal Weights</p>
          <p className="text-xl font-mono font-black text-white mt-1">{telemetry.yieldConfidence}%</p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl">
          <p className="text-xs text-zinc-500 font-medium uppercase">Field Soil Saturation</p>
          <p className="text-xl font-mono font-black text-cyan-400 mt-1">{telemetry.moisture}%</p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl">
          <p className="text-xs text-zinc-500 font-medium uppercase">Hardware Signature</p>
          <p className="text-sm font-mono font-bold text-zinc-300 mt-2 truncate">{telemetry.hardwareProof}</p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl">
          <p className="text-xs text-zinc-500 font-medium uppercase">Mesh Net Latency</p>
          <p className="text-xl font-mono font-black text-zinc-300 mt-1">{telemetry.networkLatency}ms</p>
        </div>
      </div>
    </div>
  );
}
