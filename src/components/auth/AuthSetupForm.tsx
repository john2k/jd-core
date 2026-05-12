"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

export function AuthSetupForm() {
  const [bearerToken, setBearerToken] = useState("");
  const [totp, setTotp] = useState("");
  const [mfaCookie, setMfaCookie] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const save = useCallback(async () => {
    setMessage(null);
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/auth/unifi-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bearerToken: bearerToken.trim() || undefined,
          totp: totp.trim() || undefined,
          mfaCookie: mfaCookie.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Enregistrement refusé.");
        return;
      }
      setMessage("Session enregistrée. Rechargez le tableau de bord pour tester /api/unifi.");
    } catch {
      setError("Réseau ou serveur injoignable.");
    } finally {
      setPending(false);
    }
  }, [bearerToken, totp, mfaCookie]);

  const clear = useCallback(async () => {
    setMessage(null);
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/auth/unifi-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clear: true }),
      });
      const data = (await res.json()) as { ok?: boolean };
      if (!res.ok || !data.ok) {
        setError("Effacement refusé.");
        return;
      }
      setBearerToken("");
      setTotp("");
      setMfaCookie("");
      setMessage("Cookies de session effacés.");
    } catch {
      setError("Réseau ou serveur injoignable.");
    } finally {
      setPending(false);
    }
  }, []);

  return (
    <div className="jd-widget max-w-2xl space-y-6">
      <p className="text-sm leading-relaxed text-zinc-400">
        UniFi OS peut exiger un <strong className="text-zinc-300">code TOTP</strong> (application
        d’authentification) et parfois un <strong className="text-zinc-300">cookie MFA</strong>{" "}
        renvoyé par l’API après une première tentative. Vous pouvez aussi coller un{" "}
        <strong className="text-zinc-300">jeton Bearer</strong> copié depuis les outils
        développeur du navigateur après connexion au contrôleur (prioritaire sur le mot de passe).
      </p>

      <div className="space-y-4">
        <label className="block space-y-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            Jeton Bearer (optionnel)
          </span>
          <textarea
            className="min-h-[72px] w-full rounded-xl border border-white/[0.08] bg-zinc-950/80 px-3 py-2 font-mono text-xs text-zinc-200 outline-none ring-0 placeholder:text-zinc-600 focus:border-violet-500/40"
            placeholder="eyJ… ou uft_…"
            value={bearerToken}
            onChange={(e) => setBearerToken(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            Code TOTP (6 chiffres, optionnel)
          </span>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={12}
            className="w-full rounded-xl border border-white/[0.08] bg-zinc-950/80 px-3 py-2 font-mono text-sm text-zinc-200 outline-none focus:border-violet-500/40"
            placeholder="123456"
            value={totp}
            onChange={(e) => setTotp(e.target.value.replace(/\D/g, ""))}
            autoComplete="one-time-code"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            Cookie MFA (optionnel, si l’API le demande)
          </span>
          <textarea
            className="min-h-[56px] w-full rounded-xl border border-white/[0.08] bg-zinc-950/80 px-3 py-2 font-mono text-xs text-zinc-200 outline-none focus:border-violet-500/40"
            placeholder="Valeur mfa_cookie renvoyée par le contrôleur"
            value={mfaCookie}
            onChange={(e) => setMfaCookie(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() => void save()}
          className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-500 disabled:opacity-50"
        >
          Enregistrer
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => void clear()}
          className="rounded-xl border border-white/[0.1] bg-zinc-900/80 px-4 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800 disabled:opacity-50"
        >
          Effacer la session
        </button>
        <Link
          href="/"
          className="inline-flex items-center rounded-xl px-4 py-2 text-sm text-zinc-500 transition hover:text-zinc-300"
        >
          ← Tableau de bord
        </Link>
      </div>

      {message ? <p className="text-sm text-emerald-300/90">{message}</p> : null}
      {error ? <p className="text-sm text-red-300/90">{error}</p> : null}
    </div>
  );
}
