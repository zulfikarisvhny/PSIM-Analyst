// app/videos/page.tsx
import { fetchVideos } from "@/lib/scouting/psimVideos";
import { VideosBoard } from "@/components/videos/VideosBoard";
import { DashboardPageShell } from "@/components/DashboardPageShell";

export const revalidate = 0;

export default async function VideosPage() {
  let videos: Awaited<ReturnType<typeof fetchVideos>> = [];
  let error: string | null = null;
  try {
    videos = await fetchVideos();
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  return (
    <DashboardPageShell
      title="Videos"
      description="Match footage, training clips, and opponent scouting videos — paste a YouTube or Google Drive link to add one, or a whole batch at once."
    >
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-[20px] p-4 text-sm text-red-600 mb-6">Could not load videos: {error}</div>
      )}
      <VideosBoard initialVideos={videos} />
    </DashboardPageShell>
  );
}
