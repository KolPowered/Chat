const { useEffect, useMemo, useState } = React;
const {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} = Recharts;

const LEAGUE_ID = '1194720426382082048';
const BASE = 'https://api.sleeper.app/v1';

const tabs = [
  'Overview',
  'Trade History',
  'Draft Analysis',
  'Franchise Rankings',
  'Head-to-Head',
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function App() {
  const [activeTab, setActiveTab] = useState('Overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dataset, setDataset] = useState(null);

  useEffect(() => {
    loadAll().catch((e) => {
      console.error(e);
      setError(e.message || 'Failed to load Sleeper data');
      setLoading(false);
    });
  }, []);

  async function loadAll() {
    setLoading(true);
    const cache = new Map();
    const api = async (path) => {
      const url = `${BASE}${path}`;
      if (cache.has(url)) return cache.get(url);
      await sleep(120);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Request failed (${res.status}) for ${path}`);
      const json = await res.json();
      cache.set(url, json);
      return json;
    };

    const leagues = [];
    let currentId = LEAGUE_ID;
    while (currentId && leagues.length < 8) {
      const league = await api(`/league/${currentId}`);
      leagues.push(league);
      currentId = league.previous_league_id;
      if (!currentId) break;
    }

    const seasons = [];
    for (const league of leagues) {
      const [users, rosters, winnersBracket] = await Promise.all([
        api(`/league/${league.league_id}/users`),
        api(`/league/${league.league_id}/rosters`),
        api(`/league/${league.league_id}/winners_bracket`).catch(() => []),
      ]);

      const draftId = league.draft_id;
      const [draft, picks] = draftId
        ? await Promise.all([
            api(`/draft/${draftId}`).catch(() => null),
            api(`/draft/${draftId}/picks`).catch(() => []),
          ])
        : [null, []];

      const totalWeeks = league.settings?.playoff_week_start
        ? league.settings.playoff_week_start + 2
        : 17;

      const matchupWeekly = [];
      const transactionWeekly = [];

      for (let week = 1; week <= totalWeeks; week += 1) {
        const [matchups, txns] = await Promise.all([
          api(`/league/${league.league_id}/matchups/${week}`).catch(() => []),
          api(`/league/${league.league_id}/transactions/${week}`).catch(() => []),
        ]);
        matchupWeekly.push({ week, matchups });
        transactionWeekly.push({ week, txns });
      }

      seasons.push({
        league,
        users,
        rosters,
        winnersBracket,
        draft,
        picks,
        matchupWeekly,
        transactionWeekly,
      });
    }

    setDataset(buildInsights(seasons));
    setLoading(false);
  }

  if (loading) {
    return <div className="p-8 text-center text-lg">Loading league history...</div>;
  }
  if (error) {
    return <div className="p-8 text-red-400">Error: {error}</div>;
  }

  return (
    <div className="max-w-7xl mx-auto p-5 md:p-8 fade-in">
      <header className="mb-6">
        <h1 className="text-3xl md:text-4xl font-bold text-white">Dynasty League Deep Dive</h1>
        <p className="text-slate-400 mt-2">Sleeper League {LEAGUE_ID} • {dataset.seasonsCount} seasons</p>
      </header>

      <nav className="flex flex-wrap gap-2 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={`px-4 py-2 rounded-full text-sm border transition ${activeTab === tab ? 'bg-brand-accent text-black border-brand-accent' : 'bg-brand-panel border-slate-700 text-slate-200 hover:border-brand-accent'}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </nav>

      {activeTab === 'Overview' && <OverviewTab data={dataset} />}
      {activeTab === 'Trade History' && <TradesTab data={dataset} />}
      {activeTab === 'Draft Analysis' && <DraftTab data={dataset} />}
      {activeTab === 'Franchise Rankings' && <RankingsTab data={dataset} />}
      {activeTab === 'Head-to-Head' && <H2HTab data={dataset} />}
    </div>
  );
}

function Card({ title, children, className = '' }) {
  return (
    <section className={`glass rounded-2xl border border-slate-700 p-4 md:p-5 ${className}`}>
      <h3 className="text-lg font-semibold mb-3">{title}</h3>
      {children}
    </section>
  );
}

function OverviewTab({ data }) {
  return (
    <div className="grid md:grid-cols-3 gap-4">
      <Card title="League Overview" className="md:col-span-3">
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <Stat label="Total Seasons" value={data.seasonsCount} />
          <Stat label="Current Champion" value={data.currentChampion || 'TBD'} />
          <Stat label="All-Time Wins Leader" value={data.allTimeWinsLeader || 'N/A'} />
        </div>
      </Card>

      <Card title="Championship History" className="md:col-span-2">
        <ul className="space-y-2 text-sm">
          {data.champions.map((c) => (
            <li key={c.season} className="flex justify-between border-b border-slate-700 pb-1">
              <span>{c.season}</span>
              <span className="font-medium">{c.winner} over {c.runnerUp || 'N/A'}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Titles by Team">
        <ul className="space-y-1 text-sm">
          {data.titlesByTeam.map((t) => (
            <li key={t.team} className="flex justify-between"><span>{t.team}</span><span>{t.titles}</span></li>
          ))}
        </ul>
      </Card>

      <Card title="Regular Season Wins by Year" className="md:col-span-3">
        <div className="h-72">
          <ResponsiveContainer>
            <BarChart data={data.yearlyWinsTop}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="season" stroke="#cbd5e1" />
              <YAxis stroke="#cbd5e1" />
              <Tooltip />
              <Bar dataKey="wins" fill="#60a5fa" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

function TradesTab({ data }) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card title="Trade Frequency by Team">
        <ul className="space-y-1 text-sm">
          {data.tradeFrequency.map((t) => (
            <li key={t.team} className="flex justify-between"><span>{t.team}</span><span>{t.trades}</span></li>
          ))}
        </ul>
      </Card>
      <Card title="Top Trade Partners">
        <ul className="space-y-1 text-sm">
          {data.tradeNetwork.slice(0, 12).map((e, idx) => (
            <li key={idx} className="flex justify-between"><span>{e.pair}</span><span>{e.count} deals</span></li>
          ))}
        </ul>
      </Card>
      <Card title="Major Trades (1st-round picks / multi-player)" className="md:col-span-2">
        <div className="space-y-2 text-sm max-h-96 overflow-auto pr-2">
          {data.majorTrades.map((tr) => (
            <div key={tr.id} className="border border-slate-700 rounded p-2">
              <div className="text-slate-300">{tr.season} Week {tr.week}</div>
              <div>{tr.summary}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function DraftTab({ data }) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card title="Draft Capital Accumulation">
        <div className="h-72">
          <ResponsiveContainer>
            <BarChart data={data.draftCapital}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="team" hide />
              <YAxis stroke="#cbd5e1" />
              <Tooltip />
              <Bar dataKey="totalPicks" fill="#c084fc" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card title="Notable Picks">
        <ul className="space-y-2 text-sm max-h-72 overflow-auto">
          {data.notablePicks.map((p, idx) => (
            <li key={idx} className="border-b border-slate-700 pb-1">{p}</li>
          ))}
        </ul>
      </Card>
      <Card title="Recent Draft Board Snapshot" className="md:col-span-2">
        <div className="overflow-auto text-sm">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-slate-700">
                <th className="py-2">Season</th><th>Pick</th><th>Player</th><th>Pos</th><th>Team</th>
              </tr>
            </thead>
            <tbody>
              {data.draftBoard.slice(0, 60).map((p, idx) => (
                <tr key={idx} className="border-b border-slate-800">
                  <td className="py-1">{p.season}</td>
                  <td>{p.pick}</td>
                  <td>{p.player}</td>
                  <td>{p.position || '-'}</td>
                  <td>{p.team}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function RankingsTab({ data }) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card title="Dynasty Score Leaderboard">
        <ul className="space-y-1 text-sm">
          {data.dynastyScores.map((t) => (
            <li key={t.team} className="flex justify-between"><span>{t.team}</span><span>{t.score.toFixed(1)}</span></li>
          ))}
        </ul>
      </Card>
      <Card title="Points For vs Wins Radar">
        <div className="h-72">
          <ResponsiveContainer>
            <RadarChart data={data.radarData}>
              <PolarGrid stroke="#334155" />
              <PolarAngleAxis dataKey="team" tick={false} />
              <PolarRadiusAxis stroke="#cbd5e1" />
              <Radar name="Wins" dataKey="wins" stroke="#60a5fa" fill="#60a5fa" fillOpacity={0.35} />
              <Radar name="Points" dataKey="points" stroke="#c084fc" fill="#c084fc" fillOpacity={0.25} />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card title="Franchise Trajectory" className="md:col-span-2">
        <div className="h-72">
          <ResponsiveContainer>
            <LineChart data={data.trajectory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="season" stroke="#cbd5e1" />
              <YAxis stroke="#cbd5e1" />
              <Tooltip />
              <Line type="monotone" dataKey="topTeamWins" stroke="#60a5fa" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

function H2HTab({ data }) {
  return (
    <div className="grid gap-4">
      <Card title="Rivalries (Most Frequent Playoff Opponents)">
        <ul className="space-y-1 text-sm">
          {data.rivalries.map((r, idx) => (
            <li key={idx} className="flex justify-between"><span>{r.pair}</span><span>{r.games} playoff meetings</span></li>
          ))}
        </ul>
      </Card>
      <Card title="Head-to-Head Matrix Snapshot">
        <div className="overflow-auto text-xs">
          <table className="min-w-full border-collapse">
            <thead>
              <tr>
                <th className="p-2 border border-slate-700">Team</th>
                {data.teams.slice(0, 10).map((t) => <th key={t} className="p-2 border border-slate-700">{t.slice(0, 8)}</th>)}
              </tr>
            </thead>
            <tbody>
              {data.teams.slice(0, 10).map((row) => (
                <tr key={row}>
                  <td className="p-2 border border-slate-700">{row}</td>
                  {data.teams.slice(0, 10).map((col) => (
                    <td key={col} className="p-2 border border-slate-700 text-center">{row === col ? '-' : (data.h2h[row]?.[col] || '0-0')}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-700 p-3 bg-slate-900/50">
      <div className="text-slate-400 text-xs uppercase tracking-wide">{label}</div>
      <div className="text-xl mt-1 font-semibold">{value}</div>
    </div>
  );
}

function buildInsights(seasons) {
  const nameByRosterAndSeason = {};
  const teamAggregate = {};
  const champions = [];
  const allTrades = [];
  const draftBoard = [];
  const h2h = {};
  const playoffRival = {};
  const yearlyWinsTop = [];

  for (const seasonData of seasons) {
    const season = seasonData.league.season;
    const usersById = Object.fromEntries(seasonData.users.map((u) => [u.user_id, u]));

    seasonData.rosters.forEach((r) => {
      const user = usersById[r.owner_id];
      const team = user?.metadata?.team_name || user?.display_name || `Roster ${r.roster_id}`;
      if (!nameByRosterAndSeason[season]) nameByRosterAndSeason[season] = {};
      nameByRosterAndSeason[season][r.roster_id] = team;
      if (!teamAggregate[team]) teamAggregate[team] = { team, wins: 0, pointsFor: 0, championships: 0, playoffApps: 0, titles: 0, trades: 0, picks: 0 };
      teamAggregate[team].wins += r.settings?.wins || 0;
      teamAggregate[team].pointsFor += (r.settings?.fpts || 0) + ((r.settings?.fpts_decimal || 0) / 100);
      if ((r.settings?.playoff_seed || 0) > 0) teamAggregate[team].playoffApps += 1;
    });

    const champMatch = seasonData.winnersBracket.find((m) => m.p === 1);
    if (champMatch) {
      const winner = nameByRosterAndSeason[season][champMatch.w];
      const runner = nameByRosterAndSeason[season][champMatch.l];
      champions.push({ season, winner, runnerUp: runner });
      if (winner && teamAggregate[winner]) {
        teamAggregate[winner].championships += 1;
        teamAggregate[winner].titles += 1;
      }
    }

    const topRoster = [...seasonData.rosters].sort((a, b) => (b.settings?.wins || 0) - (a.settings?.wins || 0))[0];
    if (topRoster) {
      yearlyWinsTop.push({ season, wins: topRoster.settings?.wins || 0, team: nameByRosterAndSeason[season][topRoster.roster_id] });
    }

    seasonData.transactionWeekly.forEach(({ week, txns }) => {
      txns.filter((t) => t.type === 'trade').forEach((t) => {
        const rosters = t.roster_ids || [];
        const names = rosters.map((r) => nameByRosterAndSeason[season][r]).filter(Boolean);
        names.forEach((n) => { if (teamAggregate[n]) teamAggregate[n].trades += 1; });
        const pair = [...names].sort().join(' ↔ ');
        const major = (t.draft_picks || []).some((p) => p.round === 1) || (t.adds ? Object.keys(t.adds).length >= 2 : false);
        allTrades.push({
          id: t.transaction_id,
          season,
          week,
          pair,
          major,
          summary: `${names.join(' / ')} ${major ? 'pulled off a blockbuster' : 'made a trade'}`,
        });
      });
    });

    seasonData.picks.forEach((p) => {
      const team = nameByRosterAndSeason[season][p.roster_id] || `Roster ${p.roster_id}`;
      if (teamAggregate[team]) teamAggregate[team].picks += 1;
      draftBoard.push({
        season,
        pick: `${p.round}.${p.pick_no}`,
        player: p.metadata?.first_name && p.metadata?.last_name ? `${p.metadata.first_name} ${p.metadata.last_name}` : p.player_id,
        position: p.metadata?.position,
        team,
      });
    });

    seasonData.matchupWeekly.forEach(({ week, matchups }) => {
      const buckets = {};
      matchups.forEach((m) => {
        if (!buckets[m.matchup_id]) buckets[m.matchup_id] = [];
        buckets[m.matchup_id].push(m);
      });
      Object.values(buckets).forEach((pair) => {
        if (pair.length !== 2) return;
        const [a, b] = pair;
        const aTeam = nameByRosterAndSeason[season][a.roster_id];
        const bTeam = nameByRosterAndSeason[season][b.roster_id];
        if (!aTeam || !bTeam) return;
        if (!h2h[aTeam]) h2h[aTeam] = {};
        if (!h2h[bTeam]) h2h[bTeam] = {};
        if (!h2h[aTeam][bTeam]) h2h[aTeam][bTeam] = { w: 0, l: 0 };
        if (!h2h[bTeam][aTeam]) h2h[bTeam][aTeam] = { w: 0, l: 0 };
        if ((a.points || 0) > (b.points || 0)) {
          h2h[aTeam][bTeam].w += 1;
          h2h[bTeam][aTeam].l += 1;
        } else if ((a.points || 0) < (b.points || 0)) {
          h2h[bTeam][aTeam].w += 1;
          h2h[aTeam][bTeam].l += 1;
        }
        const playoffStart = seasonData.league.settings?.playoff_week_start || 15;
        if (week >= playoffStart) {
          const k = [aTeam, bTeam].sort().join(' vs ');
          playoffRival[k] = (playoffRival[k] || 0) + 1;
        }
      });
    });
  }

  const teams = Object.keys(teamAggregate).sort();
  const dynastyScores = Object.values(teamAggregate)
    .map((t) => ({ ...t, score: t.championships * 25 + t.playoffApps * 8 + t.wins * 2 + t.pointsFor / 50 }))
    .sort((a, b) => b.score - a.score);

  const titlesByTeam = Object.values(teamAggregate).map((t) => ({ team: t.team, titles: t.titles })).sort((a, b) => b.titles - a.titles);
  const tradeFrequency = Object.values(teamAggregate).map((t) => ({ team: t.team, trades: t.trades })).sort((a, b) => b.trades - a.trades);

  const networkMap = {};
  allTrades.forEach((t) => { if (t.pair) networkMap[t.pair] = (networkMap[t.pair] || 0) + 1; });
  const tradeNetwork = Object.entries(networkMap).map(([pair, count]) => ({ pair, count })).sort((a, b) => b.count - a.count);

  const h2hSummary = {};
  for (const a of Object.keys(h2h)) {
    h2hSummary[a] = {};
    for (const b of Object.keys(h2h[a])) {
      h2hSummary[a][b] = `${h2h[a][b].w}-${h2h[a][b].l}`;
    }
  }

  return {
    seasonsCount: seasons.length,
    currentChampion: champions[0]?.winner,
    allTimeWinsLeader: dynastyScores[0]?.team,
    champions,
    titlesByTeam,
    yearlyWinsTop,
    tradeFrequency,
    tradeNetwork,
    majorTrades: allTrades.filter((t) => t.major).slice(0, 100),
    draftBoard: draftBoard.sort((a, b) => `${b.season}${a.pick}`.localeCompare(`${a.season}${b.pick}`)),
    notablePicks: draftBoard.slice(0, 20).map((p) => `${p.season} ${p.pick}: ${p.player} (${p.team})`),
    draftCapital: Object.values(teamAggregate).map((t) => ({ team: t.team, totalPicks: t.picks })).sort((a, b) => b.totalPicks - a.totalPicks),
    dynastyScores,
    radarData: dynastyScores.slice(0, 10).map((t) => ({ team: t.team, wins: t.wins, points: Math.round(t.pointsFor / 10) })),
    trajectory: yearlyWinsTop,
    rivalries: Object.entries(playoffRival).map(([pair, games]) => ({ pair, games })).sort((a, b) => b.games - a.games).slice(0, 10),
    h2h: h2hSummary,
    teams,
  };
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
