"use client";

import Image from "next/image";
import { ExternalLink, Play, X } from "lucide-react";
import { useCallback, useEffect, useId, useState } from "react";

import {
  extractYouTubeVideoId,
  youtubeEmbedUrl,
  youtubeThumbnailUrl,
  youtubeWatchUrl,
} from "@/lib/youtube/id";

type BookmarksResponse = { ok: true; links: string[] };

type Entry = { url: string; id: string };

export function YouTubeWidget() {
  const labelId = useId();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const loadBookmarks = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch("/api/bookmarks", { cache: "no-store" });
      const data = (await res.json()) as BookmarksResponse;
      const links = data.ok ? data.links : [];
      const parsed: Entry[] = [];
      for (const url of links) {
        const id = extractYouTubeVideoId(url);
        if (id) parsed.push({ url, id });
      }
      setEntries(parsed);
    } catch {
      setLoadError("Impossible de charger data/bookmarks.json.");
      setEntries([]);
    }
  }, []);

  useEffect(() => {
    void loadBookmarks();
  }, [loadBookmarks]);

  const openVideo = useCallback((id: string) => {
    window.open(youtubeWatchUrl(id), "_blank", "noopener,noreferrer");
    setActiveId(id);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!activeId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveId(null);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [activeId]);

  return (
    <>
      <div className="jd-widget flex h-full min-h-[200px] flex-col p-4">
        <div className="mb-3 flex items-center gap-2 border-b border-white/[0.06] pb-3">
          <Play className="h-3.5 w-3.5 text-red-500" aria-hidden />
          <h3 id={labelId} className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Signets YouTube
          </h3>
        </div>

        {loadError ? (
          <p className="text-xs text-red-300/90">{loadError}</p>
        ) : entries.length === 0 ? (
          <p className="text-xs leading-relaxed text-zinc-500">
            Ajoutez des URLs dans <code className="rounded bg-zinc-800 px-1 text-zinc-300">data/bookmarks.json</code>.
          </p>
        ) : (
          <ul className="flex flex-col gap-3.5" aria-labelledby={labelId}>
            {entries.map(({ url, id }) => (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => openVideo(id)}
                  title="Lire dans JD-Core (modal) et ouvrir sur YouTube dans un nouvel onglet"
                  className="group flex w-full flex-col overflow-hidden rounded-xl border border-white/[0.06] bg-zinc-900/50 text-left shadow-md shadow-black/20 ring-1 ring-inset ring-white/[0.03] transition hover:border-red-500/35 hover:bg-zinc-900/85 hover:shadow-lg hover:shadow-red-950/20 hover:ring-red-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500/60"
                >
                  <span className="relative aspect-video w-full cursor-pointer overflow-hidden bg-black/40">
                    <Image
                      src={youtubeThumbnailUrl(id)}
                      alt=""
                      width={480}
                      height={360}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                      sizes="(max-width: 1024px) 100vw, 320px"
                    />
                    <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 transition group-hover:opacity-100">
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-red-600/95 text-white shadow-lg ring-2 ring-white/20">
                        <Play className="ml-0.5 h-5 w-5" fill="currentColor" aria-hidden />
                      </span>
                    </span>
                  </span>
                  <span className="flex items-center justify-between gap-2 px-2.5 py-2.5">
                    <span className="min-w-0 truncate font-mono text-[11px] text-zinc-400" title={url}>
                      {id}
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500 group-hover:text-red-400/90">
                      <ExternalLink className="h-3 w-3 opacity-70" aria-hidden />
                      Modal + onglet
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {mounted && activeId ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          role="presentation"
          onClick={() => setActiveId(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Lecteur YouTube"
            className="relative w-full max-w-4xl overflow-hidden rounded-3xl border border-white/[0.08] bg-zinc-950/95 shadow-2xl ring-1 ring-inset ring-white/[0.06] backdrop-blur-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] bg-zinc-900/60 px-3 py-2">
              <a
                href={youtubeWatchUrl(activeId)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-zinc-900/90 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-red-500/40 hover:bg-zinc-800 hover:text-white"
              >
                <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Ouvrir sur YouTube
              </a>
              <button
                type="button"
                onClick={() => setActiveId(null)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-zinc-900/90 text-zinc-200 transition hover:bg-zinc-800 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/40"
                aria-label="Fermer la vidéo"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="aspect-video w-full bg-black">
              <iframe
                title="YouTube"
                src={youtubeEmbedUrl(activeId)}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
