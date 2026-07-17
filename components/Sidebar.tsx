'use client';
export default function Sidebar({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (tab: string) => void }) {
  const links = [
    { id: 'rebalancing', label: 'Macro Rebalancing' },
    { id: 'media', label: 'Cybernetic Media' },
    { id: 'credit', label: 'Credit Matrix' },
    { id: 'oracle', label: 'Oracle Telemetry' },
    { id: 'judiciary', label: 'Judiciary Court' },
  ];

  return (
    <aside className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col p-6 shrink-0">
      <div className="mb-10">
        <h1 className="text-xl font-black text-white tracking-wider">CMN <span className="text-emerald-400">NETWORK</span></h1>
        <p className="text-[10px] text-zinc-500 font-mono mt-1 uppercase tracking-widest">Portal v1.0.0 // Active</p>
      </div>
      <nav className="space-y-2 flex-grow">
        {links.map((link) => (
          <button
            key={link.id}
            onClick={() => setActiveTab(link.id)}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === link.id 
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
              : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
            }`}
          >
            {link.label}
          </button>
        ))}
      </nav>
      <div className="text-[10px] text-zinc-600 font-mono pt-6 border-t border-zinc-800">
        Node: Localhost:3000<br/>Sync: Operational
      </div>
    </aside>
  );
}
