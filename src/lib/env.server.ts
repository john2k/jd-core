import "server-only";

/**
 * Lecture centralisée des variables sensibles côté serveur uniquement.
 * Ne jamais préfixer des secrets avec NEXT_PUBLIC_ (exposé au navigateur).
 */

/** Retire espaces et commentaire de fin de ligne « # … » (ex. `IP=10.0.0.1  # mon routeur`). */
function readEnv(key: string): string | undefined {
  const raw = process.env[key];
  if (raw == null || raw === "") return undefined;
  const v = raw
    .trim()
    .replace(/\s+#.*$/, "")
    .trim();
  return v === "" ? undefined : v;
}

/** Adresse du contrôleur (priorité : UNIFI_IP, puis UNIFI_CONTROLLER_HOST). */
export function getUnifiIp(): string | undefined {
  return readEnv("UNIFI_IP") ?? readEnv("UNIFI_CONTROLLER_HOST");
}

/** @deprecated Utiliser getUnifiIp */
export function getUnifiControllerHost(): string | undefined {
  return getUnifiIp();
}

export function getUnifiSiteName(): string | undefined {
  return readEnv("UNIFI_SITE_NAME");
}

/** Port HTTPS du contrôleur « classique » (8443 par défaut). Ignoré en mode UniFi OS (443). */
export function getUnifiPort(): string {
  return readEnv("UNIFI_PORT") ?? "8443";
}

/** Identifiant (UNIFI_USER ou UNIFI_USERNAME). */
export function getUnifiUser(): string | undefined {
  return readEnv("UNIFI_USER") ?? readEnv("UNIFI_USERNAME");
}

/** @deprecated Utiliser getUnifiUser */
export function getUnifiUsername(): string | undefined {
  return getUnifiUser();
}

/** Mot de passe (UNIFI_PASS ou UNIFI_PASSWORD). */
export function getUnifiPass(): string | undefined {
  return readEnv("UNIFI_PASS") ?? readEnv("UNIFI_PASSWORD");
}

/** @deprecated Utiliser getUnifiPass */
export function getUnifiPassword(): string | undefined {
  return getUnifiPass();
}

export function getUnifiApiToken(): string | undefined {
  return readEnv("UNIFI_API_TOKEN");
}

export function getSshHostPrimary(): string | undefined {
  return readEnv("SSH_HOST_PRIMARY");
}

export function getSshPortPrimary(): string | undefined {
  return readEnv("SSH_PORT_PRIMARY");
}

export function getSshUserPrimary(): string | undefined {
  return readEnv("SSH_USER_PRIMARY");
}

export function getSshPrivateKeyPath(): string | undefined {
  return readEnv("SSH_PRIVATE_KEY_PATH");
}

export function getApiSecretToken(): string | undefined {
  return readEnv("API_SECRET_TOKEN");
}

export function getWebhookSigningSecret(): string | undefined {
  return readEnv("WEBHOOK_SIGNING_SECRET");
}

/** Répertoire des notes Markdown : `NOTES_DIR` ou, à défaut, `NOTES_PATH` (ex. ./notes). */
export function getNotesDir(): string {
  return readEnv("NOTES_DIR") ?? readEnv("NOTES_PATH") ?? "notes";
}

/** URL à interroger pour le statut Nextcloud (ex. page d’accueil ou /status.php). */
export function getServiceCheckNextcloudUrl(): string | undefined {
  return readEnv("SERVICECHECK_NEXTCLOUD_URL");
}

/** URL Vaultwarden (ex. /alive ou /). */
export function getServiceCheckVaultwardenUrl(): string | undefined {
  return readEnv("SERVICECHECK_VAULTWARDEN_URL");
}

/** URL Unraid : `SERVICECHECK_UNRAID_URL`, ou à défaut `https://[UNRAID_IP]/` si `UNRAID_IP` est défini. */
export function getServiceCheckUnraidUrl(): string | undefined {
  const explicit = readEnv("SERVICECHECK_UNRAID_URL");
  if (explicit) return explicit;
  const ip = readEnv("UNRAID_IP");
  if (ip) return `https://${ip}/`;
  return undefined;
}

export function getServiceStatusDefinitions(): Array<{ id: string; name: string; url: string | undefined }> {
  return [
    { id: "nextcloud", name: "Nextcloud", url: getServiceCheckNextcloudUrl() },
    { id: "vaultwarden", name: "Vaultwarden", url: getServiceCheckVaultwardenUrl() },
    { id: "unraid", name: "Unraid", url: getServiceCheckUnraidUrl() },
  ];
}

/**
 * Délai max pour les vérifications HTTP des services (VPS → labo à distance).
 * `SERVICECHECK_FETCH_TIMEOUT_MS` (millisecondes), défaut 45 s, borné 5 s–120 s.
 */
export function getServiceCheckFetchTimeoutMs(): number {
  const raw = readEnv("SERVICECHECK_FETCH_TIMEOUT_MS");
  const n = raw ? Number.parseInt(raw, 10) : NaN;
  if (!Number.isFinite(n)) return 45_000;
  return Math.min(120_000, Math.max(5_000, n));
}

/** URL complète des métriques Prometheus exposées par Unraid (ex. `http://IP:9221/metrics`). */
export function getUnraidPrometheusUrl(): string | undefined {
  return readEnv("UNRAID_PROMETHEUS_URL");
}

/** Point de montage du pool principal pour calcul d’usage (métriques node_exporter). */
export function getUnraidPoolMountpoint(): string {
  return readEnv("UNRAID_POOL_MOUNTPOINT") ?? "/mnt/user";
}
