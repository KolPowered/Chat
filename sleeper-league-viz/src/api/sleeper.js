const BASE_URL = 'https://api.sleeper.app/v1';
const cache = new Map();
let requestQueue = Promise.resolve();
const DELAY_MS = 250;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithCache(url) {
  if (cache.has(url)) return cache.get(url);
  requestQueue = requestQueue.then(() => delay(DELAY_MS));
  await requestQueue;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error ${res.status}: ${url}`);
  const data = await res.json();
  cache.set(url, data);
  return data;
}

export async function getLeague(leagueId) {
  return fetchWithCache(`${BASE_URL}/league/${leagueId}`);
}

export async function getUsers(leagueId) {
  return fetchWithCache(`${BASE_URL}/league/${leagueId}/users`);
}

export async function getRosters(leagueId) {
  return fetchWithCache(`${BASE_URL}/league/${leagueId}/rosters`);
}

export async function getMatchups(leagueId, week) {
  return fetchWithCache(`${BASE_URL}/league/${leagueId}/matchups/${week}`);
}

export async function getWinnersBracket(leagueId) {
  return fetchWithCache(`${BASE_URL}/league/${leagueId}/winners_bracket`);
}

export async function getLosersBracket(leagueId) {
  return fetchWithCache(`${BASE_URL}/league/${leagueId}/losers_bracket`);
}

export async function getTransactions(leagueId, week) {
  return fetchWithCache(`${BASE_URL}/league/${leagueId}/transactions/${week}`);
}

export async function getDraft(draftId) {
  return fetchWithCache(`${BASE_URL}/draft/${draftId}`);
}

export async function getDraftPicks(draftId) {
  return fetchWithCache(`${BASE_URL}/draft/${draftId}/picks`);
}

export async function getLeagueDrafts(leagueId) {
  return fetchWithCache(`${BASE_URL}/league/${leagueId}/drafts`);
}

export async function getTradedPicks(leagueId) {
  return fetchWithCache(`${BASE_URL}/league/${leagueId}/traded_picks`);
}

export async function getNflPlayers() {
  return fetchWithCache(`${BASE_URL}/players/nfl`);
}

export async function getAllLeagueIds(currentLeagueId) {
  const ids = [];
  let id = currentLeagueId;
  while (id) {
    ids.push(id);
    const league = await getLeague(id);
    id = league.previous_league_id;
  }
  return ids;
}

export async function fetchAllSeasons(currentLeagueId, onProgress) {
  const leagueIds = await getAllLeagueIds(currentLeagueId);
  const seasons = [];

  for (let i = 0; i < leagueIds.length; i++) {
    const leagueId = leagueIds[i];
    if (onProgress) onProgress(`Loading season ${i + 1} of ${leagueIds.length}...`);
    const league = await getLeague(leagueId);
    const users = await getUsers(leagueId);
    const rosters = await getRosters(leagueId);

    const totalWeeks = league.settings?.playoff_week_start
      ? league.settings.playoff_week_start + (league.settings.playoff_round_type === 2 ? 4 : 3) - 1
      : 17;
    const regSeasonWeeks = league.settings?.playoff_week_start
      ? league.settings.playoff_week_start - 1
      : 14;

    const matchups = {};
    for (let w = 1; w <= totalWeeks; w++) {
      try {
        matchups[w] = await getMatchups(leagueId, w);
      } catch {
        break;
      }
    }

    let winnersBracket = [];
    let losersBracket = [];
    try { winnersBracket = await getWinnersBracket(leagueId); } catch { /* optional */ }
    try { losersBracket = await getLosersBracket(leagueId); } catch { /* optional */ }

    const transactions = {};
    for (let w = 1; w <= totalWeeks; w++) {
      try {
        transactions[w] = await getTransactions(leagueId, w);
      } catch {
        break;
      }
    }

    const draftsInfo = await getLeagueDrafts(leagueId);
    const drafts = [];
    for (const draftInfo of draftsInfo) {
      try {
        const picks = await getDraftPicks(draftInfo.draft_id);
        drafts.push({ info: draftInfo, picks });
      } catch { /* draft picks may not exist */ }
    }

    let tradedPicks = [];
    try { tradedPicks = await getTradedPicks(leagueId); } catch { /* optional */ }

    seasons.push({
      leagueId,
      league,
      users,
      rosters,
      matchups,
      winnersBracket,
      losersBracket,
      transactions,
      drafts,
      tradedPicks,
      year: league.season,
      regSeasonWeeks,
      totalWeeks,
    });
  }

  return seasons;
}
