import "server-only";

import { getServiceCheckFetchTimeoutMs } from "@/lib/env.server";

export type ServicePingResult = {
  id: string;
  name: string;
  /** URL configurée dans .env (non exposée au client). */
  configured: boolean;
  up: boolean;
  /** Temps jusqu’à la réponse HTTP ou jusqu’à l’échec / timeout, en ms. */
  ms: number | null;
  /** Hôte seul pour affichage discret côté UI. */
  host: string | null;
};

export async function pingHttpUrl(url: string): Promise<{ ok: boolean; ms: number }> {
  const timeoutMs = getServiceCheckFetchTimeoutMs();
  const t0 = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
      redirect: "follow",
      headers: {
        Accept: "*/*",
        "User-Agent": "JD-Core-ServiceStatus/1.0",
      },
    });
    const ms = Date.now() - t0;
    return { ok: res.ok, ms };
  } catch {
    const ms = Date.now() - t0;
    return { ok: false, ms };
  } finally {
    clearTimeout(timeoutId);
  }
}

function safeHost(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

export async function runAllServicePings(
  definitions: Array<{ id: string; name: string; url: string | undefined }>,
): Promise<ServicePingResult[]> {
  const tasks = definitions.map(async (def) => {
    if (!def.url?.trim()) {
      return {
        id: def.id,
        name: def.name,
        configured: false,
        up: false,
        ms: null,
        host: null,
      } satisfies ServicePingResult;
    }
    const url = def.url.trim();
    const { ok, ms } = await pingHttpUrl(url);
    return {
      id: def.id,
      name: def.name,
      configured: true,
      up: ok,
      ms,
      host: safeHost(url),
    } satisfies ServicePingResult;
  });
  return Promise.all(tasks);
}
