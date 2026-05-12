import { NextResponse } from "next/server";

import { writeNoteFile } from "@/lib/notes/paths.server";

export const dynamic = "force-dynamic";

const MAX_BYTES = 2 * 1024 * 1024;

type Body = { file?: string; content?: string };

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false as const, error: "JSON invalide." }, { status: 400 });
  }
  const file = body.file;
  const content = body.content;
  if (typeof file !== "string" || typeof content !== "string") {
    return NextResponse.json({ ok: false as const, error: "Champs file et content requis." }, { status: 400 });
  }
  if (Buffer.byteLength(content, "utf8") > MAX_BYTES) {
    return NextResponse.json({ ok: false as const, error: "Contenu trop volumineux." }, { status: 413 });
  }
  const ok = await writeNoteFile(file, content);
  if (!ok) {
    return NextResponse.json({ ok: false as const, error: "Écriture impossible (nom ou permissions)." }, { status: 400 });
  }
  return NextResponse.json({ ok: true as const, file });
}
