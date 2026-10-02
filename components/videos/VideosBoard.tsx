// components/videos/VideosBoard.tsx
"use client";
import { useMemo, useState } from "react";
import { VideoRow, VIDEO_CATEGORIES, ParsedVideoEntry, getVideoEmbed, parseVideoBatch } from "@/lib/scouting/psimVideoTypes";

type Mode = "single" | "batch";

async function postVideo(entry: { title: string; url: string; category: string; description: string | null }): Promise<VideoRow> {
  const res = await fetch("/api/videos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entry),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? "Failed to add video");
  return body.video as VideoRow;
}

function VideoCard({ video, onDelete }: { video: VideoRow; onDelete: (id: number) => void }) {
  const embed = getVideoEmbed(video.url);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`Remove "${video.title}"? This can't be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/videos/${video.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Delete failed");
      onDelete(video.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
      setDeleting(false);
    }
  }

  return (
    <div className="bg-white dark:bg-[#191a1d] border border-gray-200 dark:border-[#2a2b30] rounded-lg overflow-hidden flex flex-col">
      <div className="aspect-video bg-gray-100 dark:bg-[#0e0e10]">
        {embed.embedUrl ? (
          <iframe
            src={embed.embedUrl}
            title={video.title}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <a
            href={video.url}
            target="_blank"
            rel="noreferrer"
            className="w-full h-full flex items-center justify-center text-sm text-blue-600 dark:text-[#ffcf4d] underline p-4 text-center"
          >
            Open video link
          </a>
        )}
      </div>
      <div className="p-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{video.title}</p>
          {video.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{video.description}</p>}
        </div>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          title="Remove video"
          className="shrink-0 text-gray-400 hover:text-red-500 text-xs font-semibold disabled:opacity-50"
        >
          {deleting ? "…" : "✕"}
        </button>
      </div>
    </div>
  );
}

export function VideosBoard({ initialVideos }: { initialVideos: VideoRow[] }) {
  const [videos, setVideos] = useState(initialVideos);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("single");
  const [activeCategory, setActiveCategory] = useState<string>("All");

  // Single-link form state
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState<string>(VIDEO_CATEGORIES[0]);
  const [description, setDescription] = useState("");

  // Batch-paste form state
  const [batchText, setBatchText] = useState("");
  const [parsed, setParsed] = useState<ParsedVideoEntry[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const categories = useMemo(() => {
    const set = new Set(videos.map((v) => v.category));
    return ["All", ...Array.from(set).sort()];
  }, [videos]);

  const filtered = useMemo(
    () => (activeCategory === "All" ? videos : videos.filter((v) => v.category === activeCategory)),
    [videos, activeCategory]
  );

  function resetForms() {
    setTitle("");
    setUrl("");
    setCategory(VIDEO_CATEGORIES[0]);
    setDescription("");
    setBatchText("");
    setParsed([]);
    setFormError(null);
  }

  async function handleSingleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      const video = await postVideo({ title, url, category, description: description.trim() || null });
      setVideos((prev) => [video, ...prev]);
      resetForms();
      setOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to add video");
    } finally {
      setSubmitting(false);
    }
  }

  function handleParse() {
    setFormError(null);
    const entries = parseVideoBatch(batchText);
    if (entries.length === 0) {
      setFormError("No numbered links found. Paste a block like the daily-training list with one link per numbered line.");
      return;
    }
    setParsed(entries);
  }

  async function handleBatchSubmit() {
    setFormError(null);
    setSubmitting(true);
    try {
      const added = await Promise.all(parsed.map((entry) => postVideo(entry)));
      setVideos((prev) => [...added, ...prev]);
      resetForms();
      setOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to add videos");
    } finally {
      setSubmitting(false);
    }
  }

  function handleDeleted(id: number) {
    setVideos((prev) => prev.filter((v) => v.id !== id));
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setActiveCategory(c)}
              className={`text-xs font-semibold rounded-full border px-3 py-1.5 ${
                activeCategory === c
                  ? "border-blue-600 bg-blue-50 text-blue-700 dark:border-[#ffcf4d] dark:bg-[#2a2210] dark:text-[#ffcf4d]"
                  : "border-gray-200 dark:border-[#2a2b30] text-gray-600 dark:text-gray-400 hover:border-gray-300"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            setOpen((o) => !o);
            setFormError(null);
          }}
          className="text-xs font-bold bg-blue-600 text-white rounded-md px-4 py-2 hover:bg-blue-700 dark:bg-[#ffcf4d] dark:text-[#191a1d] dark:hover:bg-[#f0c23e]"
        >
          {open ? "Close" : "+ Add video"}
        </button>
      </div>

      {open && (
        <div className="bg-white dark:bg-[#191a1d] border border-gray-200 dark:border-[#2a2b30] rounded-lg p-5 mb-6">
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => setMode("single")}
              className={`text-xs font-semibold rounded-md px-3 py-1.5 ${mode === "single" ? "bg-gray-100 dark:bg-[#2a2b30] text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400"}`}
            >
              Single link
            </button>
            <button
              type="button"
              onClick={() => setMode("batch")}
              className={`text-xs font-semibold rounded-md px-3 py-1.5 ${mode === "batch" ? "bg-gray-100 dark:bg-[#2a2b30] text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400"}`}
            >
              Paste a batch
            </button>
          </div>

          {mode === "single" && (
            <form onSubmit={handleSingleSubmit} className="flex flex-col gap-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Title"
                  className="bg-gray-50 dark:bg-[#0e0e10] border border-gray-200 dark:border-[#2a2b30] rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-blue-600 dark:focus:border-[#ffcf4d]"
                />
                <input
                  type="url"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="YouTube or Google Drive link"
                  className="bg-gray-50 dark:bg-[#0e0e10] border border-gray-200 dark:border-[#2a2b30] rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-blue-600 dark:focus:border-[#ffcf4d]"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  list="video-categories"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Category"
                  className="bg-gray-50 dark:bg-[#0e0e10] border border-gray-200 dark:border-[#2a2b30] rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-blue-600 dark:focus:border-[#ffcf4d]"
                />
                <datalist id="video-categories">
                  {VIDEO_CATEGORIES.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Description (optional)"
                  className="bg-gray-50 dark:bg-[#0e0e10] border border-gray-200 dark:border-[#2a2b30] rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-blue-600 dark:focus:border-[#ffcf4d]"
                />
              </div>
              {formError && <p className="text-xs text-red-500">{formError}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="self-start text-xs font-bold bg-blue-600 text-white rounded-md px-4 py-2 hover:bg-blue-700 dark:bg-[#ffcf4d] dark:text-[#191a1d] disabled:opacity-50"
              >
                {submitting ? "Adding…" : "Add video"}
              </button>
            </form>
          )}

          {mode === "batch" && (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Paste a block with a session title on the first line, then one numbered link per line. An all-caps line (e.g. &quot;GOALKEEPER&quot;) starts a
                new group/category for the links under it.
              </p>
              <textarea
                value={batchText}
                onChange={(e) => setBatchText(e.target.value)}
                rows={8}
                placeholder={"DAILY TRAINING - Thursday 1 October 2026\n1. https://youtu.be/...\n2. https://youtu.be/...\nGOALKEEPER\n1. https://youtu.be/..."}
                className="bg-gray-50 dark:bg-[#0e0e10] border border-gray-200 dark:border-[#2a2b30] rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-blue-600 dark:focus:border-[#ffcf4d] font-mono"
              />
              {formError && <p className="text-xs text-red-500">{formError}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleParse}
                  className="self-start text-xs font-bold bg-gray-100 dark:bg-[#2a2b30] text-gray-900 dark:text-white rounded-md px-4 py-2 hover:bg-gray-200"
                >
                  Preview
                </button>
                {parsed.length > 0 && (
                  <button
                    type="button"
                    onClick={handleBatchSubmit}
                    disabled={submitting}
                    className="self-start text-xs font-bold bg-blue-600 text-white rounded-md px-4 py-2 hover:bg-blue-700 dark:bg-[#ffcf4d] dark:text-[#191a1d] disabled:opacity-50"
                  >
                    {submitting ? "Adding…" : `Add ${parsed.length} video${parsed.length === 1 ? "" : "s"}`}
                  </button>
                )}
              </div>

              {parsed.length > 0 && (
                <div className="divide-y divide-gray-100 dark:divide-[#2a2b30] border border-gray-200 dark:border-[#2a2b30] rounded-md mt-1">
                  {parsed.map((entry, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase shrink-0 w-24 truncate">{entry.category}</span>
                      <span className="text-sm text-gray-900 dark:text-white truncate flex-1">{entry.title}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No videos yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((v) => (
            <VideoCard key={v.id} video={v} onDelete={handleDeleted} />
          ))}
        </div>
      )}
    </div>
  );
}
