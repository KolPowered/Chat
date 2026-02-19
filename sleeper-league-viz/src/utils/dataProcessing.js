// Map roster_id -> owner display_name across all seasons
export function buildOwnerMap(seasons) {
  const map = {}; // roster_id -> { owner_id, display_name, avatar, team_name }
  // Process oldest first so the newest season's names win
  const sorted = [...seasons].sort((a, b) => Number(a.year) - Number(b.year));
  for (const season of sorted) {
    const userMap = {};
    for (const u of season.users) {
      userMap[u.user_id] = u;
    }
    for (const r of season.rosters) {
      const user = userMap[r.owner_id];
      if (user) {
        // Use a unique key combining league context
        map[`${season.leagueId}_${r.roster_id}`] = {
          owner_id: r.owner_id,
          display_name: user.display_name || user.username || `Team ${r.roster_id}`,
          avatar: user.avatar,
          team_name: user.metadata?.team_name || user.display_name || `Team ${r.roster_id}`,
          roster_id: r.roster_id,
        };
        // Also store a global mapping by owner_id for cross-season
        map[r.owner_id] = {
          owner_id: r.owner_id,
          display_name: user.display_name || user.username || `Team ${r.roster_id}`,
          avatar: user.avatar,
          team_name: user.metadata?.team_name || user.display_name || `Team ${r.roster_id}`,
          roster_id: r.roster_id,
        };
      }
    }
  }
  return map;
}

// Get roster_id -> owner_id for a specific season
export function getRosterOwnerMap(season) {
  const map = {};
  for (const r of season.rosters) {
    map[r.roster_id] = r.owner_id;
  }
  return map;
}

// Get owner_id -> display_name for a specific season
export function getUserDisplayNames(season) {
  const map = {};
  for (const u of season.users) {
    map[u.user_id] = u.display_name || u.username || u.user_id;
  }
  return map;
}

// Compute season standings
export function computeStandings(season) {
  const userNames = getUserDisplayNames(season);
  return season.rosters
    .map((r) => ({
      roster_id: r.roster_id,
      owner_id: r.owner_id,
      display_name: userNames[r.owner_id] || `Team ${r.roster_id}`,
      wins: r.settings?.wins || 0,
      losses: r.settings?.losses || 0,
      ties: r.settings?.ties || 0,
      fpts: (r.settings?.fpts || 0) + (r.settings?.fpts_decimal || 0) / 100,
      fpts_against: (r.settings?.fpts_against || 0) + (r.settings?.fpts_against_decimal || 0) / 100,
      year: season.year,
    }))
    .sort((a, b) => b.wins - a.wins || b.fpts - a.fpts);
}

// Find champion and runner-up from winners bracket
export function findChampionship(season) {
  const bracket = season.winnersBracket;
  if (!bracket || bracket.length === 0) return null;

  // Find the championship game (highest round number, matchup 1)
  let maxRound = 0;
  for (const m of bracket) {
    if (m.r > maxRound) maxRound = m.r;
  }
  const championship = bracket.find((m) => m.r === maxRound && m.m === 1);
  if (!championship) return null;

  const rosterOwnerMap = getRosterOwnerMap(season);
  const userNames = getUserDisplayNames(season);

  const winnerId = championship.w;
  const loserId = championship.l;
  const winnerOwnerId = rosterOwnerMap[winnerId];
  const loserOwnerId = rosterOwnerMap[loserId];

  return {
    year: season.year,
    champion: {
      roster_id: winnerId,
      owner_id: winnerOwnerId,
      display_name: userNames[winnerOwnerId] || `Team ${winnerId}`,
    },
    runnerUp: {
      roster_id: loserId,
      owner_id: loserOwnerId,
      display_name: userNames[loserOwnerId] || `Team ${loserId}`,
    },
  };
}

// Aggregate all-time franchise stats
export function computeFranchiseStats(seasons) {
  const stats = {}; // keyed by owner_id

  for (const season of seasons) {
    const standings = computeStandings(season);
    const championship = findChampionship(season);

    for (const s of standings) {
      if (!s.owner_id) continue;
      if (!stats[s.owner_id]) {
        stats[s.owner_id] = {
          owner_id: s.owner_id,
          display_name: s.display_name,
          totalWins: 0,
          totalLosses: 0,
          totalTies: 0,
          totalFpts: 0,
          totalFptsAgainst: 0,
          championships: 0,
          runnerUps: 0,
          playoffAppearances: 0,
          seasonResults: [],
        };
      }
      const f = stats[s.owner_id];
      f.display_name = s.display_name; // Use latest name
      f.totalWins += s.wins;
      f.totalLosses += s.losses;
      f.totalTies += s.ties;
      f.totalFpts += s.fpts;
      f.totalFptsAgainst += s.fpts_against;
      f.seasonResults.push(s);

      // Check if in playoffs (winners bracket)
      const inPlayoffs = season.winnersBracket?.some(
        (m) => m.t1 === s.roster_id || m.t2 === s.roster_id
      );
      if (inPlayoffs) f.playoffAppearances++;

      if (championship) {
        if (championship.champion.owner_id === s.owner_id) f.championships++;
        if (championship.runnerUp.owner_id === s.owner_id) f.runnerUps++;
      }
    }
  }

  // Compute dynasty score
  for (const f of Object.values(stats)) {
    const totalGames = f.totalWins + f.totalLosses + f.totalTies;
    const winPct = totalGames > 0 ? f.totalWins / totalGames : 0;
    f.dynastyScore =
      f.championships * 250 +
      f.runnerUps * 100 +
      f.playoffAppearances * 50 +
      f.totalWins * 10 +
      winPct * 100 +
      (f.totalFpts / Math.max(f.seasonResults.length, 1)) * 0.05;
    f.dynastyScore = Math.round(f.dynastyScore);
  }

  return Object.values(stats).sort((a, b) => b.dynastyScore - a.dynastyScore);
}

// Compute head-to-head records
export function computeHeadToHead(seasons) {
  const records = {}; // owner_id -> owner_id -> { wins, losses, ties }
  const ownerNames = {};

  for (const season of seasons) {
    const rosterOwnerMap = getRosterOwnerMap(season);
    const userNames = getUserDisplayNames(season);
    for (const [rid, oid] of Object.entries(rosterOwnerMap)) {
      ownerNames[oid] = userNames[oid] || `Team ${rid}`;
    }

    for (const [, matchups] of Object.entries(season.matchups)) {
      if (!matchups || matchups.length === 0) continue;

      // Group matchups by matchup_id
      const grouped = {};
      for (const m of matchups) {
        if (!m.matchup_id) continue;
        if (!grouped[m.matchup_id]) grouped[m.matchup_id] = [];
        grouped[m.matchup_id].push(m);
      }

      for (const pair of Object.values(grouped)) {
        if (pair.length !== 2) continue;
        const [a, b] = pair;
        const ownerA = rosterOwnerMap[a.roster_id];
        const ownerB = rosterOwnerMap[b.roster_id];
        if (!ownerA || !ownerB || ownerA === ownerB) continue;

        const ptsA = a.points || 0;
        const ptsB = b.points || 0;

        if (!records[ownerA]) records[ownerA] = {};
        if (!records[ownerB]) records[ownerB] = {};
        if (!records[ownerA][ownerB]) records[ownerA][ownerB] = { wins: 0, losses: 0, ties: 0, totalPtsFor: 0, totalPtsAgainst: 0 };
        if (!records[ownerB][ownerA]) records[ownerB][ownerA] = { wins: 0, losses: 0, ties: 0, totalPtsFor: 0, totalPtsAgainst: 0 };

        if (ptsA > ptsB) {
          records[ownerA][ownerB].wins++;
          records[ownerB][ownerA].losses++;
        } else if (ptsB > ptsA) {
          records[ownerB][ownerA].wins++;
          records[ownerA][ownerB].losses++;
        } else {
          records[ownerA][ownerB].ties++;
          records[ownerB][ownerA].ties++;
        }
        records[ownerA][ownerB].totalPtsFor += ptsA;
        records[ownerA][ownerB].totalPtsAgainst += ptsB;
        records[ownerB][ownerA].totalPtsFor += ptsB;
        records[ownerB][ownerA].totalPtsAgainst += ptsA;
      }
    }
  }

  return { records, ownerNames };
}

// Extract all trades across seasons
export function extractTrades(seasons) {
  const trades = [];

  for (const season of seasons) {
    const rosterOwnerMap = getRosterOwnerMap(season);
    const userNames = getUserDisplayNames(season);

    for (const [week, txns] of Object.entries(season.transactions)) {
      if (!txns) continue;
      for (const txn of txns) {
        if (txn.type !== 'trade' || txn.status !== 'complete') continue;

        const rosterIds = txn.roster_ids || [];
        const adds = txn.adds || {};
        const drops = txn.drops || {};
        const draftPicks = txn.draft_picks || [];

        const sides = {};
        for (const rid of rosterIds) {
          const oid = rosterOwnerMap[rid];
          sides[rid] = {
            roster_id: rid,
            owner_id: oid,
            display_name: userNames[oid] || `Team ${rid}`,
            playersReceived: [],
            playersSent: [],
            picksReceived: [],
            picksSent: [],
          };
        }

        for (const [playerId, rosterId] of Object.entries(adds)) {
          if (sides[rosterId]) sides[rosterId].playersReceived.push(playerId);
        }
        for (const [playerId, rosterId] of Object.entries(drops)) {
          if (sides[rosterId]) sides[rosterId].playersSent.push(playerId);
        }
        for (const dp of draftPicks) {
          for (const rid of rosterIds) {
            if (Number(rid) === dp.owner_id) {
              if (sides[rid]) sides[rid].picksReceived.push(dp);
            } else {
              if (sides[rid]) sides[rid].picksSent.push(dp);
            }
          }
        }

        trades.push({
          transaction_id: txn.transaction_id,
          year: season.year,
          week: parseInt(week),
          timestamp: txn.created || txn.status_updated,
          sides: Object.values(sides),
          rosterIds,
          leagueId: season.leagueId,
        });
      }
    }
  }

  return trades.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
}

// Compute trade frequency between teams
export function computeTradeNetwork(trades) {
  const network = {}; // "ownerA_ownerB" -> count
  const teamTradeCounts = {}; // owner_id -> count

  for (const trade of trades) {
    const owners = trade.sides.map((s) => s.owner_id).filter(Boolean);
    for (const oid of owners) {
      teamTradeCounts[oid] = (teamTradeCounts[oid] || 0) + 1;
    }
    if (owners.length === 2) {
      const key = owners.sort().join('_');
      network[key] = (network[key] || 0) + 1;
    }
  }

  return { network, teamTradeCounts };
}

// Extract draft data
export function extractDraftHistory(seasons) {
  const allDrafts = [];

  for (const season of seasons) {
    const rosterOwnerMap = getRosterOwnerMap(season);
    const userNames = getUserDisplayNames(season);

    for (const draft of season.drafts) {
      const picks = draft.picks.map((p) => ({
        round: p.round,
        pick_no: p.pick_no,
        draft_slot: p.draft_slot,
        player_id: p.player_id,
        picked_by: p.picked_by,
        owner_id: rosterOwnerMap[p.picked_by] || p.picked_by,
        display_name: userNames[rosterOwnerMap[p.picked_by]] || `Team ${p.picked_by}`,
        metadata: p.metadata,
      }));

      allDrafts.push({
        draft_id: draft.info.draft_id,
        year: season.year,
        type: draft.info.type,
        status: draft.info.status,
        rounds: draft.info.settings?.rounds || 0,
        picks: picks.sort((a, b) => a.pick_no - b.pick_no),
      });
    }
  }

  return allDrafts.sort((a, b) => Number(a.year) - Number(b.year));
}

// Get team accent colors
const TEAM_COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
  '#EC4899', '#06B6D4', '#F97316', '#84CC16', '#14B8A6',
  '#6366F1', '#D946EF', '#0EA5E9', '#E11D48', '#A3E635',
  '#FB923C', '#2DD4BF', '#A78BFA', '#FB7185', '#4ADE80',
];

export function getTeamColor(index) {
  return TEAM_COLORS[index % TEAM_COLORS.length];
}

export function getOwnerColorMap(franchiseStats) {
  const map = {};
  franchiseStats.forEach((f, i) => {
    map[f.owner_id] = TEAM_COLORS[i % TEAM_COLORS.length];
  });
  return map;
}

export function getPlayerName(playerId, nflPlayers) {
  if (!nflPlayers || !playerId) return playerId || 'Unknown';
  const p = nflPlayers[playerId];
  if (!p) return playerId;
  return `${p.first_name} ${p.last_name}`;
}

export function getPlayerPosition(playerId, nflPlayers) {
  if (!nflPlayers || !playerId) return '';
  const p = nflPlayers[playerId];
  return p?.position || '';
}

export function getPlayerTeam(playerId, nflPlayers) {
  if (!nflPlayers || !playerId) return '';
  const p = nflPlayers[playerId];
  return p?.team || '';
}

export function formatDraftPick(dp) {
  return `${dp.season} Round ${dp.round}`;
}
