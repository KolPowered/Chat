# Sleeper Dynasty History App

A single-page React dashboard for exploring Sleeper dynasty league history.

## How to use

1. Start a local static server from this folder:
   ```bash
   python3 -m http.server 4173
   ```
2. Open your browser at:
   - Default league (already configured):
     `http://127.0.0.1:4173`
   - Any league ID via URL param:
     `http://127.0.0.1:4173/?leagueId=1194720426382082048`
3. Wait for data to load (all seasons are fetched by following `previous_league_id`).
4. Use tabs to explore:
   - **Overview**
   - **Trade History**
   - **Draft Analysis**
   - **Franchise Rankings**
   - **Head-to-Head**

## Notes
- The app runs fully in-browser using CDN scripts (no npm install required).
- Sleeper API calls are cached in-memory and lightly throttled for rate-limit friendliness.
