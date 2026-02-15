import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-white font-semibold text-sm">{d.opponent}</p>
      <p className="text-green-400 text-xs">Wins: {d.wins}</p>
      <p className="text-red-400 text-xs">Losses: {d.losses}</p>
      {d.ties > 0 && <p className="text-gray-400 text-xs">Ties: {d.ties}</p>}
    </div>
  );
};

export default function HeadToHead({ data }) {
  const { h2h, franchiseStats, ownerColorMap } = data;
  const { records, ownerNames } = h2h;

  const ownerIds = useMemo(
    () => franchiseStats.map((f) => f.owner_id).filter((id) => records[id]),
    [franchiseStats, records]
  );

  const [selectedOwner, setSelectedOwner] = useState(ownerIds[0] || null);

  // H2H matrix
  const matrixOwners = ownerIds.filter((id) => ownerNames[id]);

  // Selected owner's records
  const selectedRecords = useMemo(() => {
    if (!selectedOwner || !records[selectedOwner]) return [];
    return Object.entries(records[selectedOwner])
      .map(([oppId, rec]) => ({
        opponent: ownerNames[oppId] || oppId,
        oppId,
        wins: rec.wins,
        losses: rec.losses,
        ties: rec.ties,
        net: rec.wins - rec.losses,
      }))
      .sort((a, b) => b.net - a.net);
  }, [selectedOwner, records, ownerNames]);

  // Find biggest rivalries (most total games between two teams)
  const rivalries = useMemo(() => {
    const pairs = {};
    for (const oid of ownerIds) {
      if (!records[oid]) continue;
      for (const [oppId, rec] of Object.entries(records[oid])) {
        const key = [oid, oppId].sort().join('_');
        if (!pairs[key]) {
          pairs[key] = {
            team1: ownerNames[oid] || oid,
            team2: ownerNames[oppId] || oppId,
            team1Id: oid,
            team2Id: oppId,
            team1Wins: 0,
            team2Wins: 0,
            totalGames: 0,
          };
        }
        pairs[key].team1Wins = oid < oppId ? rec.wins : pairs[key].team1Wins;
        pairs[key].team2Wins = oid > oppId ? rec.wins : pairs[key].team2Wins;
        if (oid < oppId) {
          pairs[key].team1 = ownerNames[oid] || oid;
          pairs[key].team2 = ownerNames[oppId] || oppId;
          pairs[key].team1Id = oid;
          pairs[key].team2Id = oppId;
          pairs[key].team1Wins = rec.wins;
          pairs[key].team2Wins = rec.losses;
          pairs[key].totalGames = rec.wins + rec.losses + rec.ties;
        }
      }
    }
    return Object.values(pairs)
      .sort((a, b) => b.totalGames - a.totalGames)
      .slice(0, 10);
  }, [ownerIds, records, ownerNames]);

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Team Selector */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-bold text-white mb-4">Select a Team</h3>
        <div className="flex flex-wrap gap-2">
          {ownerIds.map((oid) => (
            <button
              key={oid}
              onClick={() => setSelectedOwner(oid)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                selectedOwner === oid
                  ? 'text-white shadow-lg'
                  : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
              style={selectedOwner === oid ? { backgroundColor: ownerColorMap[oid] } : {}}
            >
              {ownerNames[oid] || oid}
            </button>
          ))}
        </div>
      </div>

      {/* Selected Team H2H Breakdown */}
      {selectedOwner && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">
            {ownerNames[selectedOwner]}'s Record vs Everyone
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={selectedRecords} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                <XAxis type="number" stroke="#9CA3AF" fontSize={12} />
                <YAxis
                  type="category"
                  dataKey="opponent"
                  stroke="#9CA3AF"
                  fontSize={11}
                  width={100}
                  tick={{ fill: '#d1d5db' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="net" radius={[0, 4, 4, 0]} maxBarSize={24}>
                  {selectedRecords.map((entry) => (
                    <Cell
                      key={entry.oppId}
                      fill={entry.net >= 0 ? '#10B981' : '#EF4444'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* H2H Matrix */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 overflow-x-auto">
        <h3 className="text-lg font-bold text-white mb-4">Head-to-Head Matrix</h3>
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="text-left py-2 px-2 text-gray-500 font-medium">Team</th>
              {matrixOwners.map((oid) => (
                <th key={oid} className="py-2 px-1 text-gray-500 font-medium text-center" style={{ minWidth: '60px' }}>
                  <span className="block truncate max-w-[60px]">{ownerNames[oid]?.split(' ')[0] || '?'}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrixOwners.map((rowId) => (
              <tr key={rowId} className="border-t border-gray-800/50">
                <td className="py-2 px-2 text-gray-300 font-medium whitespace-nowrap">
                  {ownerNames[rowId] || rowId}
                </td>
                {matrixOwners.map((colId) => {
                  if (rowId === colId) {
                    return (
                      <td key={colId} className="py-2 px-1 text-center bg-gray-800/30">
                        <span className="text-gray-600">—</span>
                      </td>
                    );
                  }
                  const rec = records[rowId]?.[colId];
                  if (!rec) {
                    return (
                      <td key={colId} className="py-2 px-1 text-center text-gray-700">0-0</td>
                    );
                  }
                  const isWinning = rec.wins > rec.losses;
                  const isLosing = rec.losses > rec.wins;
                  return (
                    <td
                      key={colId}
                      className={`py-2 px-1 text-center font-mono ${
                        isWinning ? 'text-green-400' : isLosing ? 'text-red-400' : 'text-gray-400'
                      }`}
                    >
                      {rec.wins}-{rec.losses}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Top Rivalries */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-bold text-white mb-4">Biggest Rivalries</h3>
        <p className="text-xs text-gray-500 mb-4">Most games played head-to-head</p>
        <div className="space-y-3">
          {rivalries.map((r, i) => (
            <div key={i} className="flex items-center gap-4 bg-gray-800/30 rounded-lg p-3">
              <span className="text-gray-600 font-mono text-xs w-4">{i + 1}</span>
              <div className="flex-1 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-white font-medium text-sm">{r.team1}</span>
                  <span className="text-gray-600 text-xs">vs</span>
                  <span className="text-white font-medium text-sm">{r.team2}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-mono">
                    <span className={r.team1Wins > r.team2Wins ? 'text-green-400' : 'text-red-400'}>
                      {r.team1Wins}
                    </span>
                    <span className="text-gray-600"> - </span>
                    <span className={r.team2Wins > r.team1Wins ? 'text-green-400' : 'text-red-400'}>
                      {r.team2Wins}
                    </span>
                  </span>
                  <span className="text-gray-600 text-xs ml-2">({r.totalGames} games)</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
