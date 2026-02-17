import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts';
import { computeStandings, getTeamColor } from '../utils/dataProcessing';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-white font-semibold text-sm mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-xs" style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}
        </p>
      ))}
    </div>
  );
};

function RankBadge({ rank }) {
  const colors = {
    1: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    2: 'bg-gray-400/20 text-gray-300 border-gray-400/30',
    3: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  };
  return (
    <span className={`inline-flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg border text-xs sm:text-sm font-bold ${colors[rank] || 'bg-gray-800 text-gray-400 border-gray-700'}`}>
      {rank}
    </span>
  );
}

export default function FranchiseRankings({ data }) {
  const { franchiseStats, seasons, ownerColorMap } = data;

  // Trajectory: wins per season over time
  const trajectoryData = seasons.map((season) => {
    const standings = computeStandings(season);
    const entry = { year: season.year };
    for (const s of standings) {
      if (s.owner_id) {
        entry[s.display_name] = s.wins;
      }
    }
    return entry;
  });

  const allTeams = franchiseStats.map((f) => f.display_name);

  // Points trajectory
  const ptsTrajectory = seasons.map((season) => {
    const standings = computeStandings(season);
    const entry = { year: season.year };
    for (const s of standings) {
      if (s.owner_id) {
        entry[s.display_name] = Math.round(s.fpts);
      }
    }
    return entry;
  });

  // Radar data for top franchises
  const maxWins = Math.max(...franchiseStats.map((f) => f.totalWins));
  const maxPts = Math.max(...franchiseStats.map((f) => f.totalFpts));
  const maxChamps = Math.max(...franchiseStats.map((f) => f.championships), 1);
  const maxPlayoffs = Math.max(...franchiseStats.map((f) => f.playoffAppearances), 1);

  return (
    <div className="space-y-4 sm:space-y-6 animate-slide-up">
      {/* Dynasty Score Leaderboard */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-bold text-white mb-1">Dynasty Power Rankings</h3>
        <p className="text-xs text-gray-500 mb-4 sm:mb-5">
          Score based on championships (250pts), runner-ups (100pts), playoff appearances (50pts), wins (10pts), win% and avg points
        </p>
        <div className="space-y-2 sm:space-y-3">
          {franchiseStats.map((f, i) => {
            const totalGames = f.totalWins + f.totalLosses + f.totalTies;
            const winPct = totalGames > 0 ? ((f.totalWins / totalGames) * 100).toFixed(1) : '0.0';
            return (
              <div
                key={f.owner_id}
                className="flex items-center gap-2 sm:gap-4 bg-gray-800/50 rounded-xl p-3 sm:p-4 hover:bg-gray-800 transition-colors"
              >
                <RankBadge rank={i + 1} />
                <div
                  className="w-1 h-8 sm:h-10 rounded-full hidden sm:block"
                  style={{ backgroundColor: ownerColorMap[f.owner_id] }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm sm:text-base truncate">{f.display_name}</p>
                  <p className="text-[10px] sm:text-xs text-gray-500">
                    {f.totalWins}-{f.totalLosses}{f.totalTies > 0 ? `-${f.totalTies}` : ''} ({winPct}%)
                  </p>
                </div>
                <div className="flex gap-3 sm:gap-4 text-center shrink-0">
                  <div>
                    <p className="text-[10px] sm:text-xs text-gray-500">Titles</p>
                    <p className="text-base sm:text-lg font-bold text-yellow-400">{f.championships}</p>
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-xs text-gray-500">Playoffs</p>
                    <p className="text-lg font-bold text-blue-400">{f.playoffAppearances}</p>
                  </div>
                  <div>
                    <p className="text-[10px] sm:text-xs text-gray-500">Score</p>
                    <p className="text-base sm:text-lg font-bold text-purple-400">{f.dynastyScore}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Win Trajectory */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4">Win Trajectory Over Time</h3>
        <div className="h-64 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trajectoryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="year" stroke="#9CA3AF" fontSize={11} tickMargin={4} />
              <YAxis stroke="#9CA3AF" fontSize={11} width={30} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '10px' }} />
              {allTeams.map((team, i) => (
                <Line
                  key={team}
                  type="monotone"
                  dataKey={team}
                  stroke={getTeamColor(i)}
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Points Trajectory */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4">Points Trajectory Over Time</h3>
        <div className="h-64 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={ptsTrajectory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="year" stroke="#9CA3AF" fontSize={11} tickMargin={4} />
              <YAxis stroke="#9CA3AF" fontSize={11} width={40} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '10px' }} />
              {allTeams.map((team, i) => (
                <Line
                  key={team}
                  type="monotone"
                  dataKey={team}
                  stroke={getTeamColor(i)}
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Franchise Radar Charts */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {franchiseStats.slice(0, 4).map((f) => {
          const radarData = [
            { stat: 'Wins', value: (f.totalWins / maxWins) * 100 },
            { stat: 'Points', value: (f.totalFpts / maxPts) * 100 },
            { stat: 'Titles', value: (f.championships / maxChamps) * 100 },
            { stat: 'Playoffs', value: (f.playoffAppearances / maxPlayoffs) * 100 },
            { stat: 'Win %', value: f.totalWins / Math.max(f.totalWins + f.totalLosses, 1) * 100 },
          ];
          return (
            <div key={f.owner_id} className="bg-gray-900 border border-gray-800 rounded-xl p-3 sm:p-6">
              <h4 className="text-sm sm:text-md font-bold text-white mb-1 sm:mb-2 truncate">{f.display_name}</h4>
              <div className="h-40 sm:h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#374151" />
                    <PolarAngleAxis dataKey="stat" tick={{ fill: '#9CA3AF', fontSize: 9 }} />
                    <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
                    <Radar
                      dataKey="value"
                      stroke={ownerColorMap[f.owner_id]}
                      fill={ownerColorMap[f.owner_id]}
                      fillOpacity={0.2}
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detailed Stats Table - mobile card layout + desktop table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4">All-Time Statistics</h3>

        {/* Mobile: card layout */}
        <div className="sm:hidden space-y-2">
          {franchiseStats.map((f, i) => {
            const totalGames = f.totalWins + f.totalLosses + f.totalTies;
            const winPct = totalGames > 0 ? ((f.totalWins / totalGames) * 100).toFixed(1) : '0.0';
            const ppg = f.seasonResults.length > 0 ? (f.totalFpts / f.seasonResults.length).toFixed(0) : '0';
            return (
              <div key={f.owner_id} className="bg-gray-800/40 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-gray-500 text-xs font-mono">{i + 1}.</span>
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: ownerColorMap[f.owner_id] }}
                  />
                  <span className="text-white font-semibold text-sm truncate">{f.display_name}</span>
                </div>
                <div className="grid grid-cols-3 gap-x-3 gap-y-1 text-xs">
                  <div>
                    <span className="text-gray-500">Record </span>
                    <span className="text-gray-300 font-mono">{f.totalWins}-{f.totalLosses}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Win% </span>
                    <span className="text-gray-300 font-mono">{winPct}%</span>
                  </div>
                  <div>
                    <span className="text-gray-500">PF/Yr </span>
                    <span className="text-gray-300 font-mono">{ppg}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Titles </span>
                    <span className="text-yellow-400 font-mono">{f.championships}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Playoffs </span>
                    <span className="text-blue-400 font-mono">{f.playoffAppearances}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Score </span>
                    <span className="text-purple-400 font-bold">{f.dynastyScore}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop: full table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs uppercase tracking-wider border-b border-gray-800">
                <th className="text-left py-3 px-2">#</th>
                <th className="text-left py-3 px-2">Team</th>
                <th className="text-right py-3 px-2">W</th>
                <th className="text-right py-3 px-2">L</th>
                <th className="text-right py-3 px-2">Win%</th>
                <th className="text-right py-3 px-2">PF</th>
                <th className="text-right py-3 px-2">PA</th>
                <th className="text-right py-3 px-2">PF/Yr</th>
                <th className="text-right py-3 px-2">Titles</th>
                <th className="text-right py-3 px-2">Playoffs</th>
                <th className="text-right py-3 px-2">Score</th>
              </tr>
            </thead>
            <tbody>
              {franchiseStats.map((f, i) => {
                const totalGames = f.totalWins + f.totalLosses + f.totalTies;
                const winPct = totalGames > 0 ? ((f.totalWins / totalGames) * 100).toFixed(1) : '0.0';
                const ppg = f.seasonResults.length > 0 ? (f.totalFpts / f.seasonResults.length).toFixed(0) : '0';
                return (
                  <tr key={f.owner_id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="py-2.5 px-2 text-gray-500">{i + 1}</td>
                    <td className="py-2.5 px-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: ownerColorMap[f.owner_id] }}
                        />
                        <span className="text-white font-medium">{f.display_name}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-right text-green-400 font-mono">{f.totalWins}</td>
                    <td className="py-2.5 px-2 text-right text-red-400 font-mono">{f.totalLosses}</td>
                    <td className="py-2.5 px-2 text-right text-gray-300 font-mono">{winPct}%</td>
                    <td className="py-2.5 px-2 text-right text-gray-300 font-mono">{f.totalFpts.toFixed(0)}</td>
                    <td className="py-2.5 px-2 text-right text-gray-500 font-mono">{f.totalFptsAgainst.toFixed(0)}</td>
                    <td className="py-2.5 px-2 text-right text-gray-300 font-mono">{ppg}</td>
                    <td className="py-2.5 px-2 text-right text-yellow-400 font-mono">{f.championships}</td>
                    <td className="py-2.5 px-2 text-right text-blue-400 font-mono">{f.playoffAppearances}</td>
                    <td className="py-2.5 px-2 text-right text-purple-400 font-bold">{f.dynastyScore}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
