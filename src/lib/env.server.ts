import "server-only";

/**
 * Lecture centralisée des variables sensibles côté serveur uniquement.
 * Ne jamais préfixer des secrets avec NEXT_PUBLIC_ (exposé au navigateur).
 */

/** Adresse du contrôleur (priorité : UNIFI_IP, puis UNIFI_CONTROLLER_HOST). */
export function getUnifiIp(): string | undefined {
  return process.env.UNIFI_IP ?? process.env.UNIFI_CONTROLLER_HOST;
}

/** @deprecated Utiliser getUnifiIp */
export function getUnifiControllerHost(): string | undefined {
  return getUnifiIp();
}

export function getUnifiSiteName(): string | undefined {
  return process.env.UNIFI_SITE_NAME;
}

/** Port HTTPS du contrôleur « classique » (8443 par défaut). Ignoré en mode UniFi OS (443). */
export function getUnifiPort(): string {
  return process.env.UNIFI_PORT ?? "8443";
}

/** Identifiant (UNIFI_USER ou UNIFI_USERNAME). */
export function getUnifiUser(): string | undefined {
  return process.env.UNIFI_USER ?? process.env.UNIFI_USERNAME;
}

/** @deprecated Utiliser getUnifiUser */
export function getUnifiUsername(): string | undefined {
  return getUnifiUser();
}

/** Mot de passe (UNIFI_PASS ou UNIFI_PASSWORD). */
export function getUnifiPass(): string | undefined {
  return process.env.UNIFI_PASS ?? process.env.UNIFI_PASSWORD;
}

/** @deprecated Utiliser getUnifiPass */
export function getUnifiPassword(): string | undefined {
  return getUnifiPass();
}

export function getUnifiApiToken(): string | undefined {
  return process.env.UNIFI_API_TOKEN;
}

export function getSshHostPrimary(): string | undefined {
  return process.env.SSH_HOST_PRIMARY;
}

export function getSshPortPrimary(): string | undefined {
  return process.env.SSH_PORT_PRIMARY;
}

export function getSshUserPrimary(): string | undefined {
  return process.env.SSH_USER_PRIMARY;
}

export function getSshPrivateKeyPath(): string | undefined {
  return process.env.SSH_PRIVATE_KEY_PATH;
}

export function getApiSecretToken(): string | undefined {
  return process.env.API_SECRET_TOKEN;
}

export function getWebhookSigningSecret(): string | undefined {
  return process.env.WEBHOOK_SIGNING_SECRET;
}

/** Répertoire des fichiers Markdown persistés (ex. volume Docker ./notes → /app/notes) */
export function getNotesDir(): string {
  return process.env.NOTES_DIR ?? "notes";
}

/** URL à interroger pour le statut Nextcloud (ex. page d’accueil ou /status.php). */
export function getServiceCheckNextcloudUrl(): string | undefined {
  const v = process.env.SERVICECHECK_NEXTCLOUD_URL?.trim();
  return v || undefined;
}

/** URL Vaultwarden (ex. /alive ou /). */
export function getServiceCheckVaultwardenUrl(): string | undefined {
  const v = process.env.SERVICECHECK_VAULTWARDEN_URL?.trim();
  return v || undefined;
}

/** URL Unraid (ex. tableau de bord ou endpoint interne joignable par le serveur JD-Core). */
export function getServiceCheckUnraidUrl(): string | undefined {
  const v = process.env.SERVICECHECK_UNRAID_URL?.trim();
  return v || undefined;
}

export function getServiceStatusDefinitions(): Array<{ id: string; name: string; url: string | undefined }> {
  return [
    { id: "nextcloud", name: "Nextcloud", url: getServiceCheckNextcloudUrl() },
    { id: "vaultwarden", name: "Vaultwarden", url: getServiceCheckVaultwardenUrl() },
    { id: "unraid", name: "Unraid", url: getServiceCheckUnraidUrl() },
  ];
}
