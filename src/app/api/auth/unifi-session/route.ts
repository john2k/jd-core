import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const COOKIE_BASE = {
  httpOnly: true,
  path: "/",
  sameSite: "lax" as const,
};

function secureCookie(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * POST — enregistre jeton Bearer, code TOTP et/ou cookie MFA (httpOnly) pour les appels GET /api/unifi.
 * Corps JSON : `{ bearerToken?, totp?, mfaCookie?, clear?: true }`.
 */
export async function POST(req: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Corps JSON invalide." }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true as const });
  const sec = secureCookie();

  if (body.clear === true) {
    res.cookies.delete("jd_unifi_bearer");
    res.cookies.delete("jd_unifi_totp");
    res.cookies.delete("jd_unifi_mfa");
    return res;
  }

  if (typeof body.bearerToken === "string") {
    const v = body.bearerToken.trim().slice(0, 4096);
    if (v) {
      res.cookies.set("jd_unifi_bearer", v, {
        ...COOKIE_BASE,
        maxAge: 60 * 60 * 24 * 14,
        secure: sec,
      });
    } else {
      res.cookies.delete("jd_unifi_bearer");
    }
  }

  if (typeof body.totp === "string") {
    const v = body.totp.replace(/\s/g, "").slice(0, 12);
    if (v) {
      res.cookies.set("jd_unifi_totp", v, {
        ...COOKIE_BASE,
        maxAge: 60 * 30,
        secure: sec,
      });
    } else {
      res.cookies.delete("jd_unifi_totp");
    }
  }

  if (typeof body.mfaCookie === "string") {
    const v = body.mfaCookie.trim().slice(0, 2048);
    if (v) {
      res.cookies.set("jd_unifi_mfa", v, {
        ...COOKIE_BASE,
        maxAge: 60 * 30,
        secure: sec,
      });
    } else {
      res.cookies.delete("jd_unifi_mfa");
    }
  }

  return res;
}
