import { NextResponse } from "next/server";

import { fetchUnraidInsights } from "@/lib/unraid/prometheus.server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const data = await fetchUnraidInsights();
    return NextResponse.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur inconnue";
    return NextResponse.json({ ok: false as const, error: message }, { status: 500 });
  }
}
