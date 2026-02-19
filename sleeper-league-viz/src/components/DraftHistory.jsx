import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';

const POS_COLORS = {
  QB: { bg: 'bg-red-900/50', text: 'text-red-400', fill: '#EF4444' },
  RB: { bg: 'bg-blue-900/50', text: 'text-blue-400', fill: '#3B82F6' },
  WR: { bg: 'bg-green-900/50', text: 'text-green-400', fill: '#10B981' },
  TE: { bg: 'bg-yellow-900/50', text: 'text-yellow-400', fill: '#F59E0B' },
  K: { bg: 'bg-gray-700/50', text: 'text-gray-400', fill: '#6B7280' },
  DEF: { bg: 'bg-purple-900/50', text: 'text-purple-400', fill: '#8B5CF6' },
};

const DraftTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-white font-semibold text-sm">{d.name}</p>
      <p className="text-gray-400 text-xs">{d.value} picks</p>
    </div>
  );
};

function DraftBoard({ draft, nflPlayers }) {
  const [highlightPos, setHighlightPos] = useState(null);

  const rounds = useMemo(() => {
    const grouped = {};
    for (const pick of draft.picks) {
      if (!grouped[pick.round]) grouped[pick.round] = [];
      grouped[pick.round].push(pick);
    }
    return Object.entries(grouped)
      .map(([round, picks]) => ({
        round: parseInt(round),
        picks: picks.sort((a, b) => a.pick_no - b.pick_no),
      }))
      .sort((a, b) => a.round - b.round);
  }, [draft.picks]);

  return (
    <div>
      <div className="flex gap-1.5 sm:gap-2 mb-3">
        <button
          onClick={() => setHighlightPos(null)}
          className={`px-2 py-1 rounded text-xs font-medium cursor-pointer min-h-[32px] ${!highlightPos ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}
        >
          All
        </button>
        {['QB', 'RB', 'WR', 'TE'].map((pos) => (
          <button
            key={pos}
            onClick={() => setHighlightPos(highlightPos === pos ? null : pos)}
            className={`px-2 py-1 rounded text-xs font-medium cursor-pointer min-h-[32px] ${
              highlightPos === pos
                ? `${POS_COLORS[pos].bg} ${POS_COLORS[pos].text}`
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {pos}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
        <table className="w-full text-xs border-collapse">
          <tbody>
            {rounds.map(({ round, picks }) => (
              <tr key={round} className="border-b border-gray-800/50">
                <td className="py-1 px-1 sm:px-2 text-gray-600 font-mono text-center align-top w-8 sm:w-12 font-bold">
                  R{round}
                </td>
                <td className="py-1">
                  <div className="flex flex-wrap gap-1 sm:gap-1.5">
                    {picks.map((pick) => {
                      const playerName = pick.metadata?.first_name && pick.metadata?.last_name
                        ? `${pick.metadata.first_name} ${pick.metadata.last_name}`
                        : nflPlayers?.[pick.player_id]
                          ? `${nflPlayers[pick.player_id].first_name} ${nflPlayers[pick.player_id].last_name}`
                          : pick.player_id || '?';
                      const pos = pick.metadata?.position || nflPlayers?.[pick.player_id]?.position || '';
                      const dimmed = highlightPos && pos !== highlightPos;
                      const posColor = POS_COLORS[pos] || POS_COLORS.DEF;

                      return (
                        <div
                          key={pick.pick_no}
                          className={`inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-1 rounded-md border transition-opacity ${
                            dimmed
                              ? 'border-gray-800/30 opacity-20'
                              : 'border-gray-700/50 bg-gray-800/50'
                          }`}
                        >
                          <span className="text-gray-600 font-mono w-4 sm:w-5 text-right text-[10px] sm:text-xs">
                            {pick.pick_no}.
                          </span>
                          <span className={`font-bold text-[8px] sm:text-[9px] px-0.5 sm:px-1 rounded ${posColor.bg} ${posColor.text}`}>
                            {pos}
                          </span>
                          <span className={`text-gray-300 text-[10px] sm:text-xs truncate max-w-[80px] sm:max-w-none ${dimmed ? 'text-gray-700' : ''}`}>
                            {playerName}
                          </span>
                          <span className="text-gray-600 text-[9px] sm:text-[10px] hidden sm:inline">
                            ({pick.display_name?.split(' ')[0] || '?'})
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function DraftHistory({ data }) {
  const { draftHistory, nflPlayers } = data;
  const [selectedYear, setSelectedYear] = useState(draftHistory[0]?.year || null);

  const selectedDraft = useMemo(
    () => draftHistory.find((d) => d.year === selectedYear),
    [draftHistory, selectedYear]
  );

  // Position breakdown per draft
  const posBreakdown = useMemo(() => {
    return draftHistory.map((draft) => {
      const counts = { QB: 0, RB: 0, WR: 0, TE: 0, Other: 0 };
      for (const pick of draft.picks) {
        const pos = pick.metadata?.position || nflPlayers?.[pick.player_id]?.position || 'Other';
        if (counts[pos] !== undefined) {
          counts[pos]++;
        } else {
          counts.Other++;
        }
      }
      return { year: draft.year, ...counts };
    });
  }, [draftHistory, nflPlayers]);

  // Draft capital: total picks made per team across all drafts
  const draftCapital = useMemo(() => {
    const counts = {};
    for (const draft of draftHistory) {
      for (const pick of draft.picks) {
        const name = pick.display_name || `Team ${pick.picked_by}`;
        if (!counts[name]) counts[name] = { total: 0, round1: 0, round2: 0, later: 0 };
        counts[name].total++;
        if (pick.round === 1) counts[name].round1++;
        else if (pick.round === 2) counts[name].round2++;
        else counts[name].later++;
      }
    }
    return Object.entries(counts)
      .map(([name, c]) => ({ name, ...c }))
      .sort((a, b) => b.total - a.total);
  }, [draftHistory]);

  // First round picks timeline (who has picked in round 1 each year)
  const round1Timeline = useMemo(() => {
    return draftHistory.map((draft) => {
      const r1 = draft.picks.filter((p) => p.round === 1);
      return {
        year: draft.year,
        picks: r1.map((p) => ({
          pick_no: p.pick_no,
          player: p.metadata?.first_name && p.metadata?.last_name
            ? `${p.metadata.first_name} ${p.metadata.last_name}`
            : nflPlayers?.[p.player_id]
              ? `${nflPlayers[p.player_id].first_name} ${nflPlayers[p.player_id].last_name}`
              : '?',
          position: p.metadata?.position || nflPlayers?.[p.player_id]?.position || '?',
          team: p.display_name || `Team ${p.picked_by}`,
        })),
      };
    });
  }, [draftHistory, nflPlayers]);

  return (
    <div className="space-y-4 sm:space-y-6 animate-slide-up">
      {/* Draft Capital Analysis */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4">Draft Capital by Team</h3>
        <p className="text-[10px] sm:text-xs text-gray-500 mb-3 sm:mb-4">Total picks made across all drafts (includes traded picks)</p>
        <div className="h-56 sm:h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={draftCapital} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
              <XAxis type="number" stroke="#9CA3AF" fontSize={11} />
              <YAxis
                type="category"
                dataKey="name"
                stroke="#9CA3AF"
                fontSize={10}
                width={80}
                tick={{ fill: '#d1d5db' }}
              />
              <Tooltip content={<DraftTooltip />} />
              <Bar dataKey="round1" stackId="a" fill="#EF4444" name="Round 1" maxBarSize={24} />
              <Bar dataKey="round2" stackId="a" fill="#F59E0B" name="Round 2" maxBarSize={24} />
              <Bar dataKey="later" stackId="a" fill="#6B7280" name="Later Rounds" radius={[0, 4, 4, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Position Breakdown by Year */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4">Draft Position Breakdown by Year</h3>
        <div className="h-56 sm:h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={posBreakdown}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="year" stroke="#9CA3AF" fontSize={11} />
              <YAxis stroke="#9CA3AF" fontSize={11} width={30} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                labelStyle={{ color: '#fff' }}
              />
              <Bar dataKey="QB" stackId="a" fill={POS_COLORS.QB.fill} />
              <Bar dataKey="RB" stackId="a" fill={POS_COLORS.RB.fill} />
              <Bar dataKey="WR" stackId="a" fill={POS_COLORS.WR.fill} />
              <Bar dataKey="TE" stackId="a" fill={POS_COLORS.TE.fill} />
              <Bar dataKey="Other" stackId="a" fill="#6B7280" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* First Round Picks Timeline */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4">First Round History</h3>
        <div className="space-y-4">
          {round1Timeline.map((yr) => (
            <div key={yr.year}>
              <h4 className="text-xs sm:text-sm font-bold text-gray-400 mb-2">{yr.year} Draft — Round 1</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 sm:gap-2">
                {yr.picks.map((p, i) => {
                  const posColor = POS_COLORS[p.position] || POS_COLORS.DEF;
                  return (
                    <div key={i} className="flex items-center gap-1.5 sm:gap-2 bg-gray-800/40 rounded-lg px-2.5 sm:px-3 py-1.5 sm:py-2">
                      <span className="text-gray-600 font-mono text-[10px] sm:text-xs w-5 sm:w-6 shrink-0">{p.pick_no}.</span>
                      <span className={`text-[9px] sm:text-[10px] font-bold px-0.5 sm:px-1 rounded shrink-0 ${posColor.bg} ${posColor.text}`}>
                        {p.position}
                      </span>
                      <span className="text-white text-xs sm:text-sm font-medium flex-1 truncate">{p.player}</span>
                      <span className="text-gray-500 text-[10px] sm:text-xs shrink-0">{p.team.split(' ')[0]}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Full Draft Board Viewer */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 sm:p-6">
        <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4">
          <h3 className="text-base sm:text-lg font-bold text-white shrink-0">Draft Board</h3>
          <div className="flex gap-1.5 sm:gap-2 overflow-x-auto scrollbar-hide">
            {draftHistory.map((d) => (
              <button
                key={d.year}
                onClick={() => setSelectedYear(d.year)}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium cursor-pointer transition-all min-h-[32px] whitespace-nowrap ${
                  selectedYear === d.year
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                {d.year}
              </button>
            ))}
          </div>
        </div>
        {selectedDraft && (
          <DraftBoard draft={selectedDraft} nflPlayers={nflPlayers} />
        )}
      </div>
    </div>
  );
}
