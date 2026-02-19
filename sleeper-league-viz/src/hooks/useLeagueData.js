import { useState, useEffect, useRef } from 'react';
import { fetchAllSeasons, getNflPlayers } from '../api/sleeper';
import { fetchKtcValues } from '../api/ktc';
import {
  buildOwnerMap,
  computeFranchiseStats,
  computeHeadToHead,
  extractTrades,
  computeTradeNetwork,
  extractDraftHistory,
  findChampionship,
  getOwnerColorMap,
} from '../utils/dataProcessing';

const LEAGUE_ID = '1194720426382082048';

export function useLeagueData() {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState('Initializing...');
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    async function loadData() {
      try {
        setProgress('Fetching league seasons...');
        const seasons = await fetchAllSeasons(LEAGUE_ID, setProgress);

        setProgress('Loading NFL player database...');
        let nflPlayers = {};
        try {
          nflPlayers = await getNflPlayers();
        } catch {
          // Player database is nice-to-have, not critical
        }

        setProgress('Loading KeepTradeCut values...');
        let ktcValues = {};
        try {
          ktcValues = await fetchKtcValues();
        } catch {
          // KTC values are optional
        }

        setProgress('Processing franchise stats...');
        const franchiseStats = computeFranchiseStats(seasons);
        const ownerColorMap = getOwnerColorMap(franchiseStats);

        setProgress('Computing head-to-head records...');
        const h2h = computeHeadToHead(seasons);

        setProgress('Extracting trade history...');
        const trades = extractTrades(seasons);
        const tradeNetwork = computeTradeNetwork(trades);

        setProgress('Processing draft history...');
        const draftHistory = extractDraftHistory(seasons);

        setProgress('Building championship history...');
        const championships = seasons
          .map((s) => findChampionship(s))
          .filter(Boolean)
          .sort((a, b) => Number(a.year) - Number(b.year));

        const ownerMap = buildOwnerMap(seasons);

        const leagueInfo = seasons[0]?.league || {};

        setData({
          seasons: seasons.sort((a, b) => Number(a.year) - Number(b.year)),
          nflPlayers,
          ktcValues,
          franchiseStats,
          ownerColorMap,
          h2h,
          trades,
          tradeNetwork,
          draftHistory,
          championships,
          ownerMap,
          leagueInfo,
        });
        setLoading(false);
      } catch (err) {
        console.error('Failed to load league data:', err);
        setError(err.message);
        setLoading(false);
      }
    }

    loadData();
  }, []);

  return { loading, progress, error, data };
}
