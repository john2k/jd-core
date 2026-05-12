import { NextResponse } from "next/server";

import { readNoteFile } from "@/lib/notes/paths.server";

export const dynamic = "force-dynamic";

const MAX_BYTES = 2 * 1024 * 1024;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const file = searchParams.get("file");
  if (!file) {
    return NextResponse.json({ ok: false as const, error: "Paramètre file manquant." }, { status: 400 });
  }
  const content = await readNoteFile(file);
  if (content === null) {
    return NextResponse.json({ ok: false as const, error: "Fichier introuvable ou nom invalide." }, { status: 404 });
  }
  if (Buffer.byteLength(content, "utf8") > MAX_BYTES) {
    return NextResponse.json({ ok: false as const, error: "Fichier trop volumineux." }, { status: 413 });
  }
  return NextResponse.json({ ok: true as const, file, content });
}
