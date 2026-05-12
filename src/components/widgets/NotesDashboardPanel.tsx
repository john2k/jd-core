"use client";

import { FileText, Loader2, Save } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";

type ListResponse = { ok: true; files: string[] } | { ok: false; error: string };
type ContentResponse =
  | { ok: true; file: string; content: string }
  | { ok: false; error: string };
type SaveResponse = { ok: true; file: string } | { ok: false; error: string };

export function NotesDashboardPanel() {
  const [files, setFiles] = useState<string[]>([]);
  const [selected, setSelected] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [listError, setListError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedHint, setSavedHint] = useState<string | null>(null);

  const loadFiles = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const res = await fetch("/api/notes/list", { cache: "no-store" });
      const data = (await res.json()) as ListResponse;
      if (!data.ok) {
        setListError(data.error);
        setFiles([]);
        return;
      }
      setFiles(data.files);
    } catch {
      setListError("Impossible de charger la liste des notes.");
      setFiles([]);
    } finally {
      setListLoading(false);
    }
  }, []);

  const loadContent = useCallback(async (file: string) => {
    if (!file) {
      setMarkdown("");
      setLoadError(null);
      return;
    }
    setContentLoading(true);
    setLoadError(null);
    setSavedHint(null);
    try {
      const res = await fetch(`/api/notes/content?file=${encodeURIComponent(file)}`, {
        cache: "no-store",
      });
      const data = (await res.json()) as ContentResponse;
      if (!data.ok) {
        setLoadError(data.error);
        setMarkdown("");
        return;
      }
      setMarkdown(data.content);
    } catch {
      setLoadError("Erreur réseau lors du chargement du fichier.");
      setMarkdown("");
    } finally {
      setContentLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFiles();
  }, [loadFiles]);

  useEffect(() => {
    void loadContent(selected);
  }, [selected, loadContent]);

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    setSaveError(null);
    setSavedHint(null);
    try {
      const res = await fetch("/api/notes/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: selected, content: markdown }),
      });
      const data = (await res.json()) as SaveResponse;
      if (!data.ok) {
        setSaveError(data.error);
        return;
      }
      setSavedHint("Enregistré");
      window.setTimeout(() => setSavedHint(null), 2500);
    } catch {
      setSaveError("Erreur réseau lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="jd-widget flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3 border-b border-white/[0.06] pb-4">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
          <FileText className="h-3.5 w-3.5 text-sky-400/90" aria-hidden />
          Notes clients
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <label htmlFor="notes-client" className="sr-only">
            Sélectionner un client
          </label>
          <select
            id="notes-client"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            disabled={listLoading || files.length === 0}
            className="min-w-[12rem] rounded-lg border border-white/[0.1] bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none ring-0 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
          >
            <option value="">— Choisir un fichier .md —</option>
            {files.map((f) => (
              <option key={f} value={f}>
                {f.replace(/\.md$/i, "")}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={!selected || saving || contentLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-600/90 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Save className="h-4 w-4" aria-hidden />}
            Sauvegarder
          </button>
          {savedHint ? (
            <span className="text-xs font-medium text-emerald-400" role="status">
              {savedHint}
            </span>
          ) : null}
        </div>
      </div>

      {listError ? (
        <p className="rounded-lg border border-red-500/25 bg-red-950/40 px-3 py-2 text-sm text-red-200">{listError}</p>
      ) : null}
      {!listLoading && files.length === 0 && !listError ? (
        <p className="text-sm text-zinc-500">
          Aucun fichier <code className="rounded bg-zinc-800 px-1">.md</code> dans le dossier notes. Ajoutez-en dans{" "}
          <code className="rounded bg-zinc-800 px-1">./notes</code> (ou le chemin défini par{" "}
          <code className="rounded bg-zinc-800 px-1">NOTES_DIR</code>).
        </p>
      ) : null}

      {loadError ? (
        <p className="rounded-lg border border-amber-500/25 bg-amber-950/30 px-3 py-2 text-sm text-amber-100">{loadError}</p>
      ) : null}
      {saveError ? (
        <p className="rounded-lg border border-red-500/25 bg-red-950/40 px-3 py-2 text-sm text-red-200">{saveError}</p>
      ) : null}

      {selected ? (
        <div className="grid min-h-[320px] gap-4 lg:grid-cols-2">
          <div className="flex min-h-0 flex-col gap-2">
            <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Édition</span>
            <textarea
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              disabled={contentLoading}
              spellCheck={false}
                    className="min-h-[280px] flex-1 resize-y rounded-2xl border border-white/[0.07] bg-black/25 p-3 font-mono text-sm leading-relaxed text-zinc-100 outline-none ring-0 placeholder:text-zinc-600 focus:border-violet-500/35 focus:ring-2 focus:ring-violet-500/15 disabled:opacity-50"
              placeholder={contentLoading ? "Chargement…" : "Contenu Markdown…"}
            />
          </div>
          <div className="flex min-h-0 min-w-0 flex-col gap-2">
            <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Aperçu</span>
            <div className="max-h-[min(70vh,560px)] min-h-[280px] flex-1 overflow-y-auto rounded-2xl border border-white/[0.07] bg-black/20 p-4 text-sm leading-relaxed text-zinc-200 [&_a]:text-sky-400 [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-zinc-600 [&_blockquote]:pl-3 [&_blockquote]:text-zinc-400 [&_code]:rounded [&_code]:bg-zinc-800 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-emerald-300/90 [&_h1]:mb-3 [&_h1]:mt-2 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:mt-3 [&_h3]:text-base [&_h3]:font-medium [&_li]:my-0.5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-black/40 [&_pre]:p-3 [&_pre]:text-xs [&_strong]:text-zinc-50 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5">
              {contentLoading ? (
                <p className="flex items-center gap-2 text-zinc-500">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Chargement…
                </p>
              ) : (
                <ReactMarkdown>{markdown || "*Aucun contenu*"}</ReactMarkdown>
              )}
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-zinc-500">Sélectionnez un client pour afficher et modifier sa note.</p>
      )}
    </div>
  );
}
