import "server-only";
import { Agent, fetch as undiciFetch } from "undici";

import {
  getUnifiApiToken,
  getUnifiIp,
  getUnifiPass,
  getUnifiPort,
  getUnifiSiteName,
  getUnifiUser,
} from "@/lib/env.server";

const insecureAgent = new Agent({
  connect: { rejectUnauthorized: false },
});

export type UnifiAuthOverrides = {
  bearerToken?: string | null;
  totp?: string | null;
  mfaCookie?: string | null;
};

export type UnifiSummaryResult =
  | {
      ok: true;
      clients: number;
      /** Octets/s (champs UniFi `*-bytes-r`). */
      downloadBytesPerSec: number;
      uploadBytesPerSec: number;
    }
  | { ok: false; error: string };

type UndiciResponse = Awaited<ReturnType<typeof undiciFetch>>;

function cookieHeaderFromResponse(res: UndiciResponse): string {
  const headers = res.headers as unknown as { getSetCookie?: () => string[] };
  if (typeof headers.getSetCookie === "function") {
    return headers
      .getSetCookie()
      .map((c) => c.split(";")[0]?.trim())
      .filter(Boolean)
      .join("; ");
  }
  const single = res.headers.get("set-cookie");
  if (!single) return "";
  return single
    .split(/,(?=[^=]+=)/)
    .map((part) => part.split(";")[0]?.trim())
    .filter(Boolean)
    .join("; ");
}

type Auth =
  | { mode: "legacy"; base: string; cookie: string }
  | { mode: "unos"; base: string; token: string };

async function authLegacy(
  host: string,
  port: string,
  user: string,
  pass: string,
  totp?: string | null,
): Promise<Auth | null> {
  const base = `https://${host}:${port}`;
  const body: Record<string, unknown> = {
    username: user,
    password: pass,
    remember: true,
  };
  if (totp?.trim()) {
    body.token = totp.trim();
    body.ubic_2fa_token = totp.trim();
  }
  const res = await undiciFetch(`${base}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    dispatcher: insecureAgent,
  });
  let j: { meta?: { rc?: string } } = {};
  try {
    j = (await res.json()) as { meta?: { rc?: string } };
  } catch {
    return null;
  }
  if (!res.ok || j.meta?.rc !== "ok") return null;
  const cookie = cookieHeaderFromResponse(res);
  if (!cookie) return null;
  return { mode: "legacy", base, cookie };
}

type UnifiOsLoginResult =
  | { kind: "ok"; token: string; base: string }
  | { kind: "mfa_required" }
  | { kind: "fail" };

async function tryAuthUnifiOS(
  host: string,
  user: string,
  pass: string,
  opts?: { totp?: string | null; mfaCookie?: string | null },
): Promise<UnifiOsLoginResult> {
  const base = `https://${host}`;
  const body: Record<string, unknown> = {
    username: user,
    password: pass,
    remember: true,
  };
  const totp = opts?.totp?.trim();
  const mfa = opts?.mfaCookie?.trim();
  if (totp) body.token = totp;
  if (mfa) {
    body.mfa_cookie = mfa;
    body.mfaCookie = mfa;
  }
  const res = await undiciFetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    dispatcher: insecureAgent,
  });
  let j: {
    meta?: { rc?: string };
    data?: Array<{ token?: string }>;
    mfa_required?: boolean;
  } = {};
  try {
    j = (await res.json()) as typeof j;
  } catch {
    return { kind: "fail" };
  }
  const token = j.data?.[0]?.token;
  if (token && j.meta?.rc !== "error") {
    return { kind: "ok", token, base };
  }
  if (res.status === 499 || j.meta?.rc === "mfa_required" || j.mfa_required === true) {
    return { kind: "mfa_required" };
  }
  return { kind: "fail" };
}

async function resolveSiteKey(auth: Auth, siteFromEnv: string | undefined): Promise<string> {
  if (siteFromEnv) return siteFromEnv;
  if (auth.mode === "legacy") {
    const res = await undiciFetch(`${auth.base}/api/self/sites`, {
      headers: { Cookie: auth.cookie },
      dispatcher: insecureAgent,
    });
    const j = (await res.json()) as { data?: Array<{ name?: string }> };
    return j.data?.[0]?.name ?? "default";
  }
  return "default";
}

async function fetchUnifiJson(auth: Auth, site: string, path: string): Promise<unknown> {
  const rel = path.replace("{site}", encodeURIComponent(site));
  const url =
    auth.mode === "legacy"
      ? `${auth.base}${rel}`
      : `${auth.base}/proxy/network${rel}`;
  const headers: Record<string, string> =
    auth.mode === "legacy"
      ? { Cookie: auth.cookie }
      : { Authorization: `Bearer ${auth.token}` };
  const res = await undiciFetch(url, { headers, dispatcher: insecureAgent });
  return res.json();
}

function countClients(sta: unknown): number {
  if (!sta || typeof sta !== "object" || !("data" in sta)) return 0;
  const data = (sta as { data: unknown }).data;
  return Array.isArray(data) ? data.length : 0;
}

function sumStaRates(sta: unknown): { down: number; up: number } {
  if (!sta || typeof sta !== "object" || !("data" in sta)) return { down: 0, up: 0 };
  const data = (sta as { data: unknown[] }).data;
  if (!Array.isArray(data)) return { down: 0, up: 0 };
  let down = 0;
  let up = 0;
  for (const row of data) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, number | undefined>;
    down += r["rx_bytes-r"] ?? 0;
    up += r["tx_bytes-r"] ?? 0;
  }
  return { down, up };
}

function ratesFromGw(gw: unknown): { down: number; up: number } {
  if (!gw || typeof gw !== "object" || !("data" in gw)) return { down: 0, up: 0 };
  const data = (gw as { data: unknown[] }).data;
  if (!Array.isArray(data)) return { down: 0, up: 0 };
  let down = 0;
  let up = 0;
  for (const row of data) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const stat = (o.stat as Record<string, number | undefined> | undefined) ?? o;
    const d =
      (stat["rx_bytes-r"] as number | undefined) ??
      (o["rx_bytes-r"] as number | undefined) ??
      0;
    const u =
      (stat["tx_bytes-r"] as number | undefined) ??
      (o["tx_bytes-r"] as number | undefined) ??
      0;
    down += d;
    up += u;
  }
  return { down, up };
}

/**
 * Résout une session UniFi : jeton Bearer (cookie / `UNIFI_API_TOKEN`), ou login + TOTP / cookie MFA.
 */
export async function getUnifiSummary(overrides?: UnifiAuthOverrides): Promise<UnifiSummaryResult> {
  const host = getUnifiIp();
  const user = getUnifiUser();
  const pass = getUnifiPass();
  const siteEnv = getUnifiSiteName();
  const port = getUnifiPort();

  if (!host) {
    return {
      ok: false,
      error: "Variable UNIFI_IP (ou UNIFI_CONTROLLER_HOST) manquante.",
    };
  }

  const bearerFromCookie = overrides?.bearerToken?.trim();
  const bearerEnv = getUnifiApiToken()?.trim();
  const bearer = bearerFromCookie || bearerEnv;

  let auth: Auth | null = null;

  if (bearer) {
    auth = { mode: "unos", base: `https://${host}`, token: bearer };
  } else if (user && pass) {
    const totp = overrides?.totp?.trim() || undefined;
    const mfaCookie = overrides?.mfaCookie?.trim() || undefined;

    auth = await authLegacy(host, port, user, pass, totp);
    if (!auth) {
      const os = await tryAuthUnifiOS(host, user, pass, { totp, mfaCookie });
      if (os.kind === "ok") {
        auth = { mode: "unos", base: os.base, token: os.token };
      } else if (os.kind === "mfa_required" && !totp) {
        return {
          ok: false,
          error:
            "Le contrôleur exige une 2FA / session complémentaire. Saisissez le code TOTP et, si besoin, le cookie MFA sur /auth-setup.",
        };
      }
    }
    if (!auth) {
      return {
        ok: false,
        error:
          "Connexion au contrôleur UniFi impossible (identifiants, 2FA ou URL). Utilisez /auth-setup pour un jeton Bearer ou le code TOTP.",
      };
    }
  } else {
    return {
      ok: false,
      error:
        "Identifiants incomplets : UNIFI_USER / UNIFI_PASS, ou jeton UNIFI_API_TOKEN / cookie Bearer (voir /auth-setup).",
    };
  }

  const site = await resolveSiteKey(auth, siteEnv);

  const [sta, gw] = await Promise.all([
    fetchUnifiJson(auth, site, `/api/s/{site}/stat/sta`),
    fetchUnifiJson(auth, site, `/api/s/{site}/stat/gw`),
  ]);

  const clients = countClients(sta);
  let { down, up } = ratesFromGw(gw);
  if (down === 0 && up === 0) {
    const fromSta = sumStaRates(sta);
    down = fromSta.down;
    up = fromSta.up;
  }

  return { ok: true, clients, downloadBytesPerSec: down, uploadBytesPerSec: up };
}
