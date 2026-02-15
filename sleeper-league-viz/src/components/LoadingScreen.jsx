export default function LoadingScreen({ progress }) {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center">
      <div className="mb-8">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-3">Loading Dynasty History</h2>
      <p className="text-gray-400 text-sm animate-pulse-slow">{progress}</p>
      <div className="mt-8 w-64 h-1 bg-gray-800 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-blue-600 to-purple-600 rounded-full animate-pulse" style={{ width: '60%' }} />
      </div>
    </div>
  );
}
