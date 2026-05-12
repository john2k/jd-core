import Image from "next/image";
import { NotesDashboardPanel } from "@/components/widgets/NotesDashboardPanel";
import { ServiceStatus } from "@/components/widgets/ServiceStatus";
import { ShellHint } from "@/components/widgets/ShellHint";
import { UnraidInsightsWidget } from "@/components/widgets/UnraidInsightsWidget";
import { UnifiWidget } from "@/components/widgets/UnifiWidget";
import { YouTubeWidget } from "@/components/widgets/YouTubeWidget";
import { getNotesDir } from "@/lib/env.server";

export default function Home() {
  const notesDir = getNotesDir();

  return (
    <div className="flex min-h-screen flex-col pb-16 pt-6 sm:pt-10 lg:pt-12">
      <main className="jd-container flex flex-1 flex-col gap-8 lg:gap-10 xl:gap-12">
        <header className="jd-widget flex flex-col gap-4 p-6 sm:flex-row sm:items-end sm:justify-between sm:p-8">
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
              Infrastructure
            </p>
            <h1 className="bg-gradient-to-r from-zinc-50 via-zinc-200 to-zinc-500 bg-clip-text text-3xl font-semibold tracking-tight text-transparent sm:text-4xl">
              JD-Core
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-zinc-400">
              Données sensibles via{" "}
              <code className="jd-code">process.env</code> côté serveur — configuration dans{" "}
              <code className="jd-code">src/lib/env.server.ts</code>.
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-3 sm:flex-row sm:items-center">
            <a
              href="/auth-setup"
              className="text-xs font-medium text-violet-400/90 transition hover:text-violet-300"
            >
              Session UniFi / 2FA
            </a>
            <div className="flex shrink-0 items-center gap-3 opacity-80">
              <Image
                src="https://nextjs.org/icons/next.svg"
                alt=""
                width={100}
                height={22}
                className="brightness-0 invert"
                priority
              />
            </div>
          </div>
        </header>

        <section className="jd-glass-panel w-full">
          <div className="mb-6 flex flex-col gap-1 border-b border-white/[0.06] pb-5 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Bento dashboard
            </h2>
            <p className="text-[11px] text-zinc-600">Mise en page adaptative · XL / 2XL</p>
          </div>

          <div className="flex flex-col gap-6 lg:gap-8 xl:flex-row xl:items-start xl:gap-10 2xl:gap-12">
            <div className="min-w-0 flex-1 space-y-6 lg:space-y-8">
              <NotesDashboardPanel />

              <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 sm:gap-5 2xl:grid-cols-3 2xl:gap-6">
                <UnifiWidget />
                <ShellHint notesDir={notesDir} variant="bento" />
                <div className="sm:col-span-2 2xl:col-span-1 space-y-4">
                  <UnraidInsightsWidget />
                  <ServiceStatus />
                </div>
              </div>
            </div>

            <aside className="w-full shrink-0 xl:sticky xl:top-8 xl:w-[min(100%,22rem)] 2xl:w-[26rem]">
              <YouTubeWidget />
            </aside>
          </div>
        </section>

        <ol className="list-inside list-decimal space-y-2 rounded-3xl border border-white/[0.05] bg-black/20 px-5 py-4 font-mono text-xs text-zinc-500 backdrop-blur-md sm:px-6 sm:text-sm">
          <li>
            Copier <span className="text-zinc-400">.env.example</span> vers{" "}
            <span className="text-zinc-400">.env</span>.
          </li>
          <li>
            Docker : <span className="text-zinc-400">docker compose up --build</span> — volume{" "}
            <span className="text-zinc-400">./notes</span> → <span className="text-zinc-400">/app/notes</span>.
          </li>
        </ol>
      </main>

      <footer className="jd-container mt-auto flex flex-wrap items-center justify-center gap-6 border-t border-white/[0.05] pt-8 text-sm text-zinc-600">
        <a
          className="inline-flex items-center gap-2 text-zinc-500 transition hover:text-zinc-300"
          href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image aria-hidden src="https://nextjs.org/icons/file.svg" alt="" width={16} height={16} className="opacity-60" />
          Documentation Next.js
        </a>
      </footer>
    </div>
  );
}
