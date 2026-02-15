import { useState, useMemo, useRef, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { getPlayerName, getPlayerPosition, formatDraftPick } from '../utils/dataProcessing';
import { lookupKtcValue } from '../api/ktc';

function TradeCard({ trade, nflPlayers, ktcValues }) {
  const hasKtc = Object.keys(ktcValues || {}).length > 0;

  function sideValue(side) {
    if (!hasKtc) return 0;
    let total = 0;
    for (const pid of side.playersReceived) {
      const name = getPlayerName(pid, nflPlayers);
      const ktc = lookupKtcValue(ktcValues, name);
      if (ktc) total += ktc.value;
    }
    return total;
  }

  return (
    <div className="bg-gray-800/40 rounded-xl p-4 border border-gray-700/50 hover:border-gray-600 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-mono text-gray-500">
          {trade.year} — Week {trade.week}
        </span>
        {trade.timestamp && (
          <span className="text-xs text-gray-600">
            {new Date(trade.timestamp).toLocaleDateString()}
          </span>
        )}
      </div>
      <div className={`grid gap-4 ${trade.sides.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {trade.sides.map((side, i) => {
          const ktcVal = sideValue(side);
          return (
            <div key={i} className="space-y-2">
              <p className="text-sm font-semibold text-white">{side.display_name} receives:</p>
              <div className="space-y-1">
                {side.playersReceived.map((pid) => {
                  const name = getPlayerName(pid, nflPlayers);
                  const pos = getPlayerPosition(pid, nflPlayers);
                  const ktc = lookupKtcValue(ktcValues, name);
                  return (
                    <div key={pid} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {pos && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            pos === 'QB' ? 'bg-red-900/50 text-red-400' :
                            pos === 'RB' ? 'bg-blue-900/50 text-blue-400' :
                            pos === 'WR' ? 'bg-green-900/50 text-green-400' :
                            'bg-yellow-900/50 text-yellow-400'
                          }`}>
                            {pos}
                          </span>
                        )}
                        <span className="text-sm text-gray-300">{name}</span>
                      </div>
                      {ktc && (
                        <span className="text-xs font-mono text-emerald-400">{ktc.value}</span>
                      )}
                    </div>
                  );
                })}
                {side.picksReceived.map((dp, j) => (
                  <div key={j} className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-900/50 text-purple-400">
                      PICK
                    </span>
                    <span className="text-sm text-gray-300">{formatDraftPick(dp)}</span>
                  </div>
                ))}
                {side.playersReceived.length === 0 && side.picksReceived.length === 0 && (
                  <span className="text-xs text-gray-600 italic">Nothing</span>
                )}
              </div>
              {hasKtc && ktcVal > 0 && (
                <p className="text-xs font-mono text-emerald-500 mt-1">
                  KTC Total: {ktcVal}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TradeNetworkSimple({ tradeNetwork, ownerNames, ownerColorMap }) {
  const { network, teamTradeCounts } = tradeNetwork;
  const canvasRef = useRef(null);

  const nodes = useMemo(() => {
    const ids = Object.keys(teamTradeCounts);
    const count = ids.length;
    const cx = 250, cy = 200, radius = 150;
    return ids.map((id, i) => {
      const angle = (2 * Math.PI * i) / count - Math.PI / 2;
      return {
        id,
        name: ownerNames[id] || id,
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
        trades: teamTradeCounts[id],
        color: ownerColorMap[id] || '#3B82F6',
      };
    });
  }, [teamTradeCounts, ownerNames, ownerColorMap]);

  const edges = useMemo(() => {
    return Object.entries(network).map(([key, count]) => {
      const [a, b] = key.split('_');
      return { a, b, count };
    });
  }, [network]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = 500 * dpr;
    canvas.height = 400 * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, 500, 400);

    const nodeMap = {};
    nodes.forEach((n) => { nodeMap[n.id] = n; });

    // Draw edges
    for (const edge of edges) {
      const from = nodeMap[edge.a];
      const to = nodeMap[edge.b];
      if (!from || !to) continue;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.strokeStyle = `rgba(99, 102, 241, ${Math.min(edge.count / 10, 0.8)})`;
      ctx.lineWidth = Math.min(edge.count * 0.8, 6);
      ctx.stroke();

      // Label on edge
      if (edge.count >= 2) {
        const mx = (from.x + to.x) / 2;
        const my = (from.y + to.y) / 2;
        ctx.fillStyle = '#6B7280';
        ctx.font = '10px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(edge.count.toString(), mx, my - 4);
      }
    }

    // Draw nodes
    for (const node of nodes) {
      const r = Math.max(8, Math.min(node.trades * 1.5, 20));
      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
      ctx.fillStyle = node.color;
      ctx.fill();
      ctx.strokeStyle = '#111827';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label
      ctx.fillStyle = '#E5E7EB';
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(node.name.split(' ')[0], node.x, node.y + r + 14);
    }
  }, [nodes, edges]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: 500, height: 400 }}
      className="mx-auto"
    />
  );
}

const TradeTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-white font-semibold text-sm">{d.name}</p>
      <p className="text-blue-400 text-xs">{d.trades} trades</p>
    </div>
  );
};

export default function TradeHistory({ data }) {
  const { trades, tradeNetwork, nflPlayers, ktcValues, franchiseStats, ownerColorMap } = data;
  const { ownerNames } = data.h2h;

  const [yearFilter, setYearFilter] = useState('all');
  const [search, setSearch] = useState('');

  const years = useMemo(() => [...new Set(trades.map((t) => t.year))].sort(), [trades]);

  const filteredTrades = useMemo(() => {
    return trades.filter((t) => {
      if (yearFilter !== 'all' && t.year !== yearFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const matchesTeam = t.sides.some((s) => s.display_name?.toLowerCase().includes(q));
        const matchesPlayer = t.sides.some((s) =>
          s.playersReceived.some((pid) =>
            getPlayerName(pid, nflPlayers).toLowerCase().includes(q)
          )
        );
        return matchesTeam || matchesPlayer;
      }
      return true;
    });
  }, [trades, yearFilter, search, nflPlayers]);

  // Trades per year
  const tradesByYear = useMemo(() => {
    const counts = {};
    for (const t of trades) {
      counts[t.year] = (counts[t.year] || 0) + 1;
    }
    return Object.entries(counts)
      .map(([year, count]) => ({ year, count }))
      .sort((a, b) => a.year.localeCompare(b.year));
  }, [trades]);

  // Trade frequency by team
  const tradeFreq = useMemo(() => {
    return franchiseStats
      .map((f) => ({
        name: f.display_name,
        trades: data.tradeNetwork.teamTradeCounts[f.owner_id] || 0,
        color: ownerColorMap[f.owner_id],
      }))
      .sort((a, b) => b.trades - a.trades);
  }, [franchiseStats, data.tradeNetwork, ownerColorMap]);

  // Major trades (involving 1st round picks or 3+ players)
  const majorTrades = useMemo(() => {
    return trades.filter((t) => {
      const has1stRound = t.sides.some((s) =>
        s.picksReceived.some((p) => p.round === 1) || s.picksSent.some((p) => p.round === 1)
      );
      const multiPlayer = t.sides.some((s) => s.playersReceived.length >= 3);
      return has1stRound || multiPlayer;
    });
  }, [trades]);

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Trade Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Trades</p>
          <p className="text-2xl font-extrabold text-white">{trades.length}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Major Trades</p>
          <p className="text-2xl font-extrabold text-yellow-400">{majorTrades.length}</p>
          <p className="text-xs text-gray-500">Involving 1st round picks</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Most Active Trader</p>
          <p className="text-2xl font-extrabold text-blue-400">{tradeFreq[0]?.name || '—'}</p>
          <p className="text-xs text-gray-500">{tradeFreq[0]?.trades || 0} trades</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Trades/Season</p>
          <p className="text-2xl font-extrabold text-green-400">
            {years.length > 0 ? (trades.length / years.length).toFixed(1) : 0}
          </p>
        </div>
      </div>

      {/* Trades Per Year Chart */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-bold text-white mb-4">Trades Per Season</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={tradesByYear}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="year" stroke="#9CA3AF" fontSize={12} />
              <YAxis stroke="#9CA3AF" fontSize={12} />
              <Tooltip content={<TradeTooltip />} />
              <Bar dataKey="count" fill="#6366F1" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Trade Frequency by Team */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-bold text-white mb-4">Trade Frequency by Team</h3>
        <div className="space-y-2">
          {tradeFreq.map((t) => (
            <div key={t.name} className="flex items-center gap-3">
              <span className="text-sm text-gray-300 w-32 truncate">{t.name}</span>
              <div className="flex-1 bg-gray-800 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${(t.trades / Math.max(tradeFreq[0]?.trades, 1)) * 100}%`,
                    backgroundColor: t.color,
                  }}
                />
              </div>
              <span className="text-xs font-mono text-gray-400 w-8 text-right">{t.trades}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Trade Network */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-bold text-white mb-2">Trade Network</h3>
        <p className="text-xs text-gray-500 mb-4">Line thickness indicates frequency of trades between teams</p>
        <TradeNetworkSimple
          tradeNetwork={tradeNetwork}
          ownerNames={ownerNames}
          ownerColorMap={ownerColorMap}
        />
      </div>

      {/* Trade History List */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <h3 className="text-lg font-bold text-white">Trade Log</h3>
          <div className="flex gap-2 flex-wrap">
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-1.5"
            >
              <option value="all">All Seasons</option>
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Search player or team..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-1.5 w-48"
            />
          </div>
        </div>
        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
          {filteredTrades.slice(0, 50).map((trade) => (
            <TradeCard
              key={trade.transaction_id}
              trade={trade}
              nflPlayers={nflPlayers}
              ktcValues={ktcValues}
            />
          ))}
          {filteredTrades.length > 50 && (
            <p className="text-center text-gray-600 text-sm py-4">
              Showing 50 of {filteredTrades.length} trades
            </p>
          )}
          {filteredTrades.length === 0 && (
            <p className="text-center text-gray-600 text-sm py-8">No trades found</p>
          )}
        </div>
      </div>
    </div>
  );
}
