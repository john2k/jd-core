import type { Metadata } from "next";
import Link from "next/link";

import { AuthSetupForm } from "@/components/auth/AuthSetupForm";

export const metadata: Metadata = {
  title: "Session UniFi · JD-Core",
  description: "Saisie manuelle Bearer / TOTP / MFA pour le contrôleur UniFi",
};

export default function AuthSetupPage() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 pb-16 pt-8 sm:pt-12">
      <main className="jd-container flex flex-1 flex-col gap-8">
        <header className="flex flex-col gap-2 border-b border-white/[0.06] pb-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
            Configuration
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100 sm:text-3xl">
            Session &amp; 2FA UniFi
          </h1>
          <p className="max-w-2xl text-sm text-zinc-500">
            Les valeurs sont stockées en cookies{" "}
            <span className="font-mono text-zinc-400">httpOnly</span> sur ce domaine (non visibles
            en JavaScript côté client). Préférez un compte API dédié ou{" "}
            <span className="font-mono text-zinc-400">UNIFI_API_TOKEN</span> dans{" "}
            <span className="font-mono text-zinc-400">.env</span> lorsque c’est possible.
          </p>
          <Link href="/" className="mt-2 w-fit text-xs text-violet-400/90 hover:text-violet-300">
            ← Retour au dashboard
          </Link>
        </header>

        <AuthSetupForm />
      </main>
    </div>
  );
}
