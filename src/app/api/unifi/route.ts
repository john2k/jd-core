import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getUnifiSummary } from "@/lib/unifi/stats.server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET — Stats contrôleur UniFi (débit Rx/Tx instantané, nombre de clients).
 * Variables : UNIFI_IP, UNIFI_USER, UNIFI_PASS (voir .env.example).
 *
 * Les requêtes HTTP vers le contrôleur utilisent l’API `fetch` (via `undici`
 * pour accepter les certificats TLS auto-signés). Authentification :
 * cookie de session après `POST …/api/login` (mode legacy), ou Bearer
 * après `POST …/api/auth/login` (UniFi OS) — voir `stats.server.ts`.
 *
 * Jeton / TOTP / cookie MFA : cookies httpOnly posés par POST /api/auth/unifi-session (page /auth-setup).
 */
export async function GET() {
  try {
    const jar = cookies();
    const summary = await getUnifiSummary({
      bearerToken: jar.get("jd_unifi_bearer")?.value,
      totp: jar.get("jd_unifi_totp")?.value,
      mfaCookie: jar.get("jd_unifi_mfa")?.value,
    });
    return NextResponse.json(summary);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur inconnue";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
