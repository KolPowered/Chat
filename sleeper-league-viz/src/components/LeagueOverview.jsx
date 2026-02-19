import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { computeStandings, getTeamColor } from '../utils/dataProcessing';

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-5 animate-fade-in">
      <p className="text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-lg sm:text-2xl font-extrabold ${accent || 'text-white'} truncate`}>{value}</p>
      {sub && <p className="text-xs sm:text-sm text-gray-400 mt-1 truncate">{sub}</p>}
    </div>
  );
}

function ChampionBanner({ champ }) {
  return (
    <div className="flex items-center gap-2 sm:gap-3 py-2">
      <span className="text-xs sm:text-sm font-mono text-gray-500 w-10 sm:w-12 shrink-0">{champ.year}</span>
      <div className="flex-1 flex items-center gap-1.5 sm:gap-2 min-w-0">
        <span className="text-yellow-400 text-base sm:text-lg shrink-0">&#9813;</span>
        <span className="text-white font-semibold text-sm sm:text-base truncate">{champ.champion.display_name}</span>
      </div>
      <span className="text-gray-500 text-xs sm:text-sm shrink-0">
        def. <span className="hidden sm:inline">{champ.runnerUp.display_name}</span>
        <span className="sm:hidden">{champ.runnerUp.display_name.split(' ')[0]}</span>
      </span>
    </div>
  );
}

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

export default function LeagueOverview({ data }) {
  const { seasons, championships, franchiseStats, ownerColorMap } = data;

  const allTimeWinsLeader = franchiseStats[0];
  const currentChamp = championships[championships.length - 1];
  const mostChampionships = [...franchiseStats].sort((a, b) => b.championships - a.championships)[0];

  // Build win totals per year per team for bar chart
  const barData = seasons.map((season) => {
    const standings = computeStandings(season);
    const entry = { year: season.year };
    for (const s of standings) {
      if (s.owner_id) {
        entry[s.display_name] = s.wins;
      }
    }
    return entry;
  });

  // Get unique team names across all seasons
  const allTeams = [...new Set(franchiseStats.map((f) => f.display_name))];

  // Build points per year data
  const ptsData = seasons.map((season) => {
    const standings = computeStandings(season);
    const entry = { year: season.year };
    for (const s of standings) {
      if (s.owner_id) {
        entry[s.display_name] = Math.round(s.fpts);
      }
    }
    return entry;
  });

  return (
    <div className="space-y-4 sm:space-y-6 animate-slide-up">
      {/* Top Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Total Seasons"
          value={seasons.length}
          sub={`${seasons[0]?.year} — ${seasons[seasons.length - 1]?.year}`}
        />
        <StatCard
          label="Current Champion"
          value={currentChamp?.champion.display_name || 'TBD'}
          sub={currentChamp ? `${currentChamp.year} Season` : ''}
          accent="text-yellow-400"
        />
        <StatCard
          label="All-Time Wins Leader"
          value={allTimeWinsLeader?.display_name || '—'}
          sub={`${allTimeWinsLeader?.totalWins || 0} wins`}
          accent="text-blue-400"
        />
        <StatCard
          label="Most Championships"
          value={mostChampionships?.display_name || '—'}
          sub={`${mostChampionships?.championships || 0} titles`}
          accent="text-purple-400"
        />
      </div>

      {/* Championship History */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-6 animate-fade-in">
        <h3 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4">Championship History</h3>
        <div className="divide-y divide-gray-800">
          {championships.map((c) => (
            <ChampionBanner key={c.year} champ={c} />
          ))}
        </div>
      </div>

      {/* Regular Season Wins by Year */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-6 animate-fade-in">
        <h3 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4">Regular Season Wins by Year</h3>
        <div className="h-64 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="year" stroke="#9CA3AF" fontSize={11} tickMargin={4} />
              <YAxis stroke="#9CA3AF" fontSize={11} width={30} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '10px', color: '#9CA3AF' }} />
              {allTeams.map((team, i) => (
                <Bar
                  key={team}
                  dataKey={team}
                  fill={getTeamColor(i)}
                  radius={[2, 2, 0, 0]}
                  maxBarSize={20}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Points For by Year */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-6 animate-fade-in">
        <h3 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4">Total Points by Year</h3>
        <div className="h-64 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={ptsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="year" stroke="#9CA3AF" fontSize={11} tickMargin={4} />
              <YAxis stroke="#9CA3AF" fontSize={11} width={40} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '10px', color: '#9CA3AF' }} />
              {allTeams.map((team, i) => (
                <Bar
                  key={team}
                  dataKey={team}
                  fill={getTeamColor(i)}
                  radius={[2, 2, 0, 0]}
                  maxBarSize={20}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-6 animate-fade-in">
          <h3 className="text-base sm:text-lg font-bold text-white mb-3">Playoff Appearances</h3>
          <div className="space-y-2">
            {[...franchiseStats]
              .sort((a, b) => b.playoffAppearances - a.playoffAppearances)
              .map((f) => (
                <div key={f.owner_id} className="flex items-center justify-between gap-2">
                  <span className="text-xs sm:text-sm text-gray-300 truncate min-w-0">{f.display_name}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <div
                      className="h-2 rounded-full"
                      style={{
                        width: `${(f.playoffAppearances / seasons.length) * 100}px`,
                        backgroundColor: ownerColorMap[f.owner_id] || '#3B82F6',
                      }}
                    />
                    <span className="text-xs font-mono text-gray-400 w-6 text-right">
                      {f.playoffAppearances}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-6 animate-fade-in">
          <h3 className="text-base sm:text-lg font-bold text-white mb-3">All-Time Points Leaders</h3>
          <div className="space-y-2">
            {[...franchiseStats]
              .sort((a, b) => b.totalFpts - a.totalFpts)
              .map((f) => (
                <div key={f.owner_id} className="flex items-center justify-between gap-2">
                  <span className="text-xs sm:text-sm text-gray-300 truncate min-w-0">{f.display_name}</span>
                  <span className="text-xs sm:text-sm font-mono text-gray-400 shrink-0">
                    {f.totalFpts.toFixed(1)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
