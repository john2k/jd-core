import { NextResponse } from "next/server";

import { listMarkdownFiles } from "@/lib/notes/paths.server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const files = await listMarkdownFiles();
    return NextResponse.json({ ok: true as const, files });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur lecture du dossier notes";
    return NextResponse.json({ ok: false as const, error: message }, { status: 500 });
  }
}
