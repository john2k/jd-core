import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-dynamic";

function normalizeLinks(data: unknown): string[] {
  if (Array.isArray(data)) {
    return data.filter((x): x is string => typeof x === "string");
  }
  if (data && typeof data === "object" && "links" in data) {
    const links = (data as { links: unknown }).links;
    if (Array.isArray(links)) {
      return links.filter((x): x is string => typeof x === "string");
    }
  }
  return [];
}

export async function GET() {
  const filePath = path.join(process.cwd(), "data", "bookmarks.json");
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    const links = normalizeLinks(parsed);
    return NextResponse.json({ ok: true as const, links });
  } catch {
    return NextResponse.json({ ok: true as const, links: [] as string[] });
  }
}
