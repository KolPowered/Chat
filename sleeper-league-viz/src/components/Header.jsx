export default function Header({ leagueInfo, seasons }) {
  const years = seasons.map((s) => s.year).sort();
  const firstYear = years[0];
  const lastYear = years[years.length - 1];

  return (
    <header className="bg-gradient-to-r from-gray-900 via-gray-900 to-blue-900/30 border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-5 sm:py-8">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xl sm:text-2xl font-black text-white shadow-lg shrink-0">
            {(leagueInfo.name || 'D')[0]}
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight truncate">
              {leagueInfo.name || 'Dynasty League'}
            </h1>
            <p className="text-gray-400 text-xs sm:text-sm mt-0.5">
              {seasons.length} Seasons — {firstYear} to {lastYear} — {leagueInfo.total_rosters || '?'} Teams
              {leagueInfo.settings?.type === 2 && ' — Dynasty'}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
