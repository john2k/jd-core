/**
 * Extrait l'identifiant vidéo YouTube (11 caractères) depuis une URL ou un ID brut.
 */
export function extractYouTubeVideoId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;

  try {
    const u = new URL(trimmed);
    const host = u.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = u.pathname.replace(/^\//, "").split("/")[0];
      return validateYouTubeId(id);
    }

    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      const parts = u.pathname.split("/").filter(Boolean);
      if (parts[0] === "embed" && parts[1]) return validateYouTubeId(parts[1]);
      if (parts[0] === "shorts" && parts[1]) return validateYouTubeId(parts[1]);
      if (parts[0] === "live" && parts[1]) return validateYouTubeId(parts[1]);
      const v = u.searchParams.get("v");
      if (v) return validateYouTubeId(v);
    }
  } catch {
    return null;
  }

  return null;
}

function validateYouTubeId(raw: string | undefined): string | null {
  if (!raw) return null;
  const id = raw.split(/[?&#]/)[0];
  if (!/^[a-zA-Z0-9_-]{11}$/.test(id)) return null;
  return id;
}

export function youtubeThumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

export function youtubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?autoplay=1&rel=0`;
}

/** Page watch officielle (nouvel onglet). */
export function youtubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
}
