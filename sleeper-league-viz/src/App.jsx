import { useState } from 'react';
import { useLeagueData } from './hooks/useLeagueData';
import LoadingScreen from './components/LoadingScreen';
import Header from './components/Header';
import LeagueOverview from './components/LeagueOverview';
import FranchiseRankings from './components/FranchiseRankings';
import HeadToHead from './components/HeadToHead';
import TradeHistory from './components/TradeHistory';
import DraftHistory from './components/DraftHistory';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'rankings', label: 'Franchise Rankings' },
  { id: 'h2h', label: 'Head-to-Head' },
  { id: 'trades', label: 'Trade History' },
  { id: 'drafts', label: 'Draft History' },
];

export default function App() {
  const { loading, progress, error, data } = useLeagueData();
  const [activeTab, setActiveTab] = useState('overview');

  if (loading) return <LoadingScreen progress={progress} />;
  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="bg-red-900/30 border border-red-700 rounded-xl p-8 max-w-md text-center">
          <h2 className="text-xl font-bold text-red-400 mb-2">Failed to Load</h2>
          <p className="text-gray-300">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <Header leagueInfo={data.leagueInfo} seasons={data.seasons} />
      <nav className="sticky top-0 z-40 bg-gray-950/90 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-3 sm:px-4">
          <div className="flex gap-1 overflow-x-auto scrollbar-hide py-2">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 sm:px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all cursor-pointer min-h-[44px] ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {activeTab === 'overview' && <LeagueOverview data={data} />}
        {activeTab === 'rankings' && <FranchiseRankings data={data} />}
        {activeTab === 'h2h' && <HeadToHead data={data} />}
        {activeTab === 'trades' && <TradeHistory data={data} />}
        {activeTab === 'drafts' && <DraftHistory data={data} />}
      </main>

      <footer className="border-t border-gray-800 py-6 text-center text-gray-600 text-xs safe-bottom">
        Dynasty League Visualizer — Powered by Sleeper API
        {Object.keys(data.ktcValues || {}).length > 0 && ' & KeepTradeCut'}
      </footer>
    </div>
  );
}
