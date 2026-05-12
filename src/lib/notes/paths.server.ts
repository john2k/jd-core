import "server-only";
import fs from "node:fs/promises";
import path from "node:path";

import { getNotesDir } from "@/lib/env.server";

/** Répertoire absolu des notes Markdown. */
export function getResolvedNotesRoot(): string {
  const dir = getNotesDir().trim();
  if (!dir) return path.join(process.cwd(), "notes");
  return path.isAbsolute(dir) ? path.normalize(dir) : path.join(process.cwd(), dir);
}

/**
 * Valide un nom de fichier .md (pas de chemin, pas de traversal).
 * Retourne le basename sûr ou null.
 */
export function assertSafeMdFilename(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  const base = path.basename(trimmed);
  if (base !== trimmed) return null;
  if (!trimmed.endsWith(".md")) return null;
  if (base !== trimmed) return null;
  if (base.includes("..")) return null;
  if (/[\\/:*?"<>|]/.test(base)) return null;
  if (base.length > 180) return null;
  return base;
}

export async function listMarkdownFiles(): Promise<string[]> {
  const root = getResolvedNotesRoot();
  let entries: string[];
  try {
    entries = await fs.readdir(root);
  } catch {
    return [];
  }
  return entries
    .filter((name) => name.endsWith(".md") && assertSafeMdFilename(name))
    .sort((a, b) => a.localeCompare(b, "fr"));
}

export async function readNoteFile(filename: string): Promise<string | null> {
  const safe = assertSafeMdFilename(filename);
  if (!safe) return null;
  const root = getResolvedNotesRoot();
  const full = path.join(root, safe);
  const resolvedRoot = path.resolve(root);
  const resolvedFull = path.resolve(full);
  if (!resolvedFull.startsWith(resolvedRoot + path.sep) && resolvedFull !== resolvedRoot) {
    return null;
  }
  try {
    return await fs.readFile(full, "utf8");
  } catch {
    return null;
  }
}

export async function writeNoteFile(filename: string, content: string): Promise<boolean> {
  const safe = assertSafeMdFilename(filename);
  if (!safe) return false;
  const root = getResolvedNotesRoot();
  const full = path.join(root, safe);
  const resolvedRoot = path.resolve(root);
  const resolvedFull = path.resolve(full);
  if (!resolvedFull.startsWith(resolvedRoot + path.sep) && resolvedFull !== resolvedRoot) {
    return false;
  }
  try {
    await fs.mkdir(resolvedRoot, { recursive: true });
    await fs.writeFile(resolvedFull, content, "utf8");
    return true;
  } catch {
    return false;
  }
}
