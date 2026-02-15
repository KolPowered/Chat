const KTC_CACHE_KEY = 'ktc_player_values';
const KTC_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

function getCachedKtcData() {
  try {
    const raw = localStorage.getItem(KTC_CACHE_KEY);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp < KTC_CACHE_TTL) return data;
  } catch { /* ignore cache errors */ }
  return null;
}

function setCachedKtcData(data) {
  try {
    localStorage.setItem(KTC_CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
  } catch { /* ignore cache errors */ }
}

function parseKtcHtml(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const players = {};

  doc.querySelectorAll('.onePlayer').forEach((el) => {
    try {
      const nameEl = el.querySelector('.player-name a');
      const valueEl = el.querySelector('.value p');
      const posEl = el.querySelector('.position');
      if (!nameEl || !valueEl) return;

      const name = nameEl.textContent.trim().replace(/\s+(SF|SEA|NYJ|NYG|LAR|LAC|KC|GB|NO|NE|TB|LV|JAX|IND|HOU|DEN|DAL|CLE|CIN|CHI|CAR|BUF|BAL|ATL|ARI|WAS|DET|MIN|PIT|PHI|MIA|TEN)\s*$/, '').trim();
      const value = parseInt(valueEl.textContent.trim(), 10);
      const position = posEl ? posEl.textContent.trim().replace(/\d+/g, '').trim() : '';
      const href = nameEl.getAttribute('href') || '';
      const slugMatch = href.match(/players\/(.+)$/);
      const slug = slugMatch ? slugMatch[1] : '';

      if (name && !isNaN(value)) {
        players[name.toLowerCase()] = { name, value, position, slug };
      }
    } catch { /* skip malformed player entry */ }
  });

  return players;
}

export async function fetchKtcValues() {
  const cached = getCachedKtcData();
  if (cached) return cached;

  const allPlayers = {};

  try {
    for (let page = 0; page <= 9; page++) {
      for (const format of [1, 0]) {
        const url = `/ktc-proxy/dynasty-rankings?page=${page}&filters=QB|WR|RB|TE|RDP&format=${format}`;
        try {
          const res = await fetch(url);
          if (!res.ok) continue;
          const html = await res.text();
          const parsed = parseKtcHtml(html);
          for (const [key, val] of Object.entries(parsed)) {
            if (!allPlayers[key] || format === 0) {
              allPlayers[key] = { ...val, sf_value: format === 0 ? val.value : undefined };
            }
            if (format === 0 && allPlayers[key]) {
              allPlayers[key].sf_value = val.value;
            }
          }
        } catch {
          continue;
        }
      }
    }
  } catch { /* ignore fetch errors */ }

  if (Object.keys(allPlayers).length > 0) {
    setCachedKtcData(allPlayers);
  }

  return allPlayers;
}

export function lookupKtcValue(ktcData, playerName) {
  if (!ktcData || !playerName) return null;
  const key = playerName.toLowerCase().trim();
  return ktcData[key] || null;
}

export function getTradeKtcValue(ktcData, playerIds, nflPlayers) {
  if (!ktcData || !nflPlayers) return 0;
  let total = 0;
  for (const pid of playerIds) {
    const player = nflPlayers[pid];
    if (player) {
      const fullName = `${player.first_name} ${player.last_name}`.toLowerCase().trim();
      const ktcPlayer = ktcData[fullName];
      if (ktcPlayer) total += ktcPlayer.value || 0;
    }
  }
  return total;
}
