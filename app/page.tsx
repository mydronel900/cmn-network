'use client';
import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import WealthDistributionDashboard from '../components/WealthDistributionDashboard';

export default function Portal() {
  const [activeTab, setActiveTab] = useState('rebalancing');

  return (
    <>
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <section className="flex-1 overflow-y-auto p-12 bg-gradient-to-br from-zinc-950 to-black">
        {activeTab === 'rebalancing' && <WealthDistributionDashboard />}
        {/* We will route other components here as we build them */}
      </section>
    </>
  );
}
