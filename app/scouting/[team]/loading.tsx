// app/scouting/[team]/loading.tsx
// Next.js renders this automatically the instant navigation starts, while
// the async server component below fetches from Supabase — without it,
// clicking a report link just sits there with no feedback until the data
// (several parallel queries) resolves.
export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-10 bg-gray-50 dark:bg-[#0e0e10] text-gray-900 dark:text-white min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-gray-500 dark:text-gray-400">
        <span className="w-8 h-8 rounded-full border-2 border-gray-300 dark:border-gray-600 border-t-blue-600 dark:border-t-[#ffcf4d] animate-spin" />
        <p className="text-sm font-semibold">Loading scouting report…</p>
      </div>
    </div>
  );
}
