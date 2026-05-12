#!/usr/bin/env bash
# JD-Core — déploiement autonome (Ubuntu / Debian)
# Usage : sudo ./deploy.sh   (recommandé : Docker, APT et mount NAS nécessitent souvent root)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ "${EUID:-}" -ne 0 ]; then
  echo "🔐 Élévation des privilèges requise (Docker, APT, montage NAS)…"
  exec sudo -E env "PATH=$PATH" bash "$0" "$@"
fi

echo ""
echo "🐳 [1/6] Vérification de Docker et « docker compose »…"

compose_run() {
  "${COMPOSE[@]}" "$@"
}

if docker compose version &>/dev/null 2>&1; then
  COMPOSE=(docker compose)
  echo "   ✅ « docker compose » est disponible."
elif command -v docker-compose &>/dev/null && docker-compose version &>/dev/null 2>&1; then
  COMPOSE=(docker-compose)
  echo "   ✅ « docker-compose » (legacy) est disponible et fonctionne."
else
  echo "   📦 Installation de Docker et Compose…"
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -qq
  apt-get install -y --no-install-recommends ca-certificates curl gnupg

  # Paquet APT « docker-compose » v1 : souvent cassé sur Ubuntu 24.04+ (Python 3.12, plus de distutils).
  if command -v docker-compose &>/dev/null && ! docker-compose version &>/dev/null 2>&1; then
    echo "   ⚠️  Suppression du « docker-compose » v1 APT incompatible (erreur distutils / Python 3.12)…"
    apt-get remove -y docker-compose python3-docker-compose 2>/dev/null || true
    apt-get autoremove -y 2>/dev/null || true
  fi

  if ! command -v docker &>/dev/null; then
    apt-get install -y --no-install-recommends docker.io
    systemctl enable --now docker 2>/dev/null || true
  fi

  if docker compose version &>/dev/null 2>&1; then
    COMPOSE=(docker compose)
    echo "   ✅ « docker compose » disponible avec le moteur déjà installé."
  elif apt-get install -y --no-install-recommends docker-compose-plugin &>/dev/null && docker compose version &>/dev/null 2>&1; then
    COMPOSE=(docker compose)
    echo "   ✅ Paquet « docker-compose-plugin » installé (APT)."
  elif apt-get install -y --no-install-recommends docker-compose &>/dev/null && docker-compose version &>/dev/null 2>&1; then
    COMPOSE=(docker-compose)
    echo "   ✅ Paquet « docker-compose » (v1) installé et exécutable (environnement ancien)."
  else
    echo "   📥 Compose v2 indisponible ou « docker-compose » v1 inutilisable — installation via https://get.docker.com …"
    echo "   ⚠️  Retrait de « docker.io » / « docker-compose » pour éviter les conflits avec Docker CE."
    apt-get remove -y docker-compose python3-docker-compose 2>/dev/null || true
    apt-get remove -y docker.io 2>/dev/null || true
    curl -fsSL https://get.docker.com | sh
    COMPOSE=(docker compose)
    echo "   ✅ Docker CE + Compose v2 installés via le script officiel."
  fi

  echo "   🔎 Vérification :"
  docker --version
  compose_run version
fi

echo ""
echo "📄 [2/6] Vérification du fichier .env…"
if [ ! -f .env ]; then
  echo "   ❌ Le fichier .env est absent à la racine du dépôt."
  echo "   ➜ Créez-le à la main (ex. copie de .env.example) : on ne peut pas deviner vos mots de passe ni vos secrets."
  echo "   ➜ Arrêt du déploiement."
  exit 1
fi
echo "   ✅ .env présent."

echo ""
echo "📂 Chargement de .env (montage NAS, chemins)…"
# shellcheck disable=SC1091
set -a
source .env
set +a

NAS_MP="${NAS_MOUNT_POINT:-/mnt/nas_notes}"

echo ""
echo "💾 [3/6] Vérification du montage NAS (${NAS_MP})…"

is_mounted() {
  local mp="$1"
  if command -v mountpoint &>/dev/null && mountpoint -q "$mp" 2>/dev/null; then
    return 0
  fi
  if command -v findmnt &>/dev/null && findmnt -n "$mp" &>/dev/null; then
    return 0
  fi
  return 1
}

if is_mounted "$NAS_MP"; then
  echo "   ✅ ${NAS_MP} est bien monté."
else
  echo "   ⚠️  ${NAS_MP} n’est pas monté — tentative à partir des variables .env…"
  if [ -z "${NAS_MOUNT_SOURCE:-}" ]; then
    echo "   ❌ NAS_MOUNT_SOURCE est vide dans .env (ex. //serveur/Partage pour CIFS)."
    echo "   ➜ Définissez NAS_MOUNT_SOURCE (et NAS_MOUNT_OPTIONS pour CIFS) puis relancez."
    exit 1
  fi
  mkdir -p "$NAS_MP"
  FS="${NAS_FS_TYPE:-cifs}"
  case "$FS" in
    cifs)
      apt-get install -y --no-install-recommends cifs-utils >/dev/null
      if [ -z "${NAS_MOUNT_OPTIONS:-}" ]; then
        echo "   ❌ NAS_MOUNT_OPTIONS est requis pour CIFS (credentials, uid, etc.)."
        exit 1
      fi
      echo "   🔗 Montage CIFS : ${NAS_MOUNT_SOURCE} → ${NAS_MP}"
      mount -t cifs "$NAS_MOUNT_SOURCE" "$NAS_MP" -o "$NAS_MOUNT_OPTIONS"
      ;;
    nfs)
      apt-get install -y --no-install-recommends nfs-common >/dev/null
      OPT="${NAS_MOUNT_OPTIONS:-defaults}"
      echo "   🔗 Montage NFS : ${NAS_MOUNT_SOURCE} → ${NAS_MP}"
      mount -t nfs "$NAS_MOUNT_SOURCE" "$NAS_MP" -o "$OPT"
      ;;
    *)
      echo "   ❌ NAS_FS_TYPE inconnu : ${FS} (utilisez « cifs » ou « nfs »)."
      exit 1
      ;;
  esac
  if ! is_mounted "$NAS_MP"; then
    echo "   ❌ Le montage a échoué (vérifiez NAS_MOUNT_SOURCE / NAS_MOUNT_OPTIONS / réseau)."
    exit 1
  fi
  echo "   ✅ Montage NAS réussi."
fi

echo ""
echo "📥 [4/6] Mise à jour du code (git pull)…"
git pull
echo "   ✅ git pull terminé."

echo ""
echo "🚀 [5/6] Construction et démarrage des conteneurs…"
compose_run up --build -d
echo "   ✅ docker compose up --build -d terminé."

echo ""
echo "🧹 [6/6] Nettoyage des images Docker inutilisées…"
docker image prune -f
echo "   ✅ docker image prune -f terminé."

echo ""
echo "🎉 Déploiement JD-Core terminé avec succès."
