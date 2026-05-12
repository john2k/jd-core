type ShellHintProps = {
  notesDir: string;
  /** Carte type « Bento » sombre (alignée sur le dashboard). */
  variant?: "default" | "bento";
};

export function ShellHint({ notesDir, variant = "default" }: ShellHintProps) {
  const isBento = variant === "bento";

  return (
    <section
      className={
        isBento
          ? "jd-widget w-full text-sm text-zinc-200"
          : "w-full max-w-xl rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
      }
    >
      <p className={isBento ? "font-medium text-zinc-100" : "font-medium"}>Module widget (exemple)</p>
      <p className={isBento ? "mt-2 text-zinc-500" : "mt-2 text-zinc-600 dark:text-zinc-400"}>
        Dossier notes (via{" "}
        <code
          className={
            isBento
              ? "rounded bg-zinc-800/80 px-1 text-zinc-300 ring-1 ring-white/5"
              : "rounded bg-zinc-200 px-1 dark:bg-zinc-800"
          }
        >
          process.env.NOTES_DIR
        </code>
        ) :{" "}
        <code
          className={
            isBento
              ? "rounded bg-zinc-800/80 px-1 font-mono text-emerald-300/90 ring-1 ring-white/5"
              : "rounded bg-zinc-200 px-1 dark:bg-zinc-800"
          }
        >
          {notesDir}
        </code>
      </p>
    </section>
  );
}
