import { NextResponse } from "next/server";

import { getServiceStatusDefinitions } from "@/lib/env.server";
import { runAllServicePings } from "@/lib/service-status/ping.server";

/**
 * Les vérifications HTTP (fetch) vers Nextcloud / Vaultwarden / Unraid sont
 * exécutées ici, sur le serveur Node — pas dans le navigateur. Ainsi, la
 * politique CORS des services distants ne s’applique pas à ces requêtes.
 * Le client ne fait qu’appeler cette route sur la même origine que JD-Core.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const definitions = getServiceStatusDefinitions();
    const services = await runAllServicePings(definitions);
    return NextResponse.json({ ok: true as const, services });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur inconnue";
    return NextResponse.json({ ok: false as const, error: message }, { status: 500 });
  }
}
