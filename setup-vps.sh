#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RESET='\033[0m'

echo_red() { echo -e "${RED}$*${RESET}" >&2; }
echo_green() { echo -e "${GREEN}$*${RESET}"; }
echo_info() { echo -e "${CYAN}$*${RESET}"; }
echo_alert() { echo -e "${YELLOW}$*${RESET}"; }

if [ "${EUID:-}" -ne 0 ]; then
  echo_red "Ce script doit être exécuté en root (ex. sudo ./setup-vps.sh)."
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_ROOT"

echo_info "→ Mise à jour des paquets et installation de Git…"
apt-get update -qq
apt-get install -y --no-install-recommends git ca-certificates curl gnupg

if command -v docker &>/dev/null && docker compose version &>/dev/null 2>&1; then
  echo_green "Docker et Docker Compose semblent déjà installés. Étape d'installation contournée."
else
  echo_info "→ Installation de Docker Engine et du plugin Docker Compose (get.docker.com)…"
  curl -fsSL https://get.docker.com | sh
fi

echo_info "→ Activation du service Docker…"
systemctl enable --now docker

if [ -n "${SUDO_USER:-}" ]; then
  usermod -aG docker "$SUDO_USER"
  echo_green "L'utilisateur « $SUDO_USER » a été ajouté au groupe « docker » (déconnexion / nouvelle session requise pour l'utiliser sans sudo)."
fi

echo_info "→ Création du dossier notes à la racine du projet…"
mkdir -p "$PROJECT_ROOT/notes"
chmod 755 "$PROJECT_ROOT/notes"
echo_green "Dossier créé : $PROJECT_ROOT/notes"

echo_green "→ Vérification des versions…"
docker --version
docker compose version
git --version

echo ""
echo_alert "════════════════════════════════════════════════════════════════"
echo_alert "  Avant le premier déploiement : créez un fichier .env à la racine"
echo_alert "  du projet (copiez .env.example puis renseignez vos secrets)."
echo_alert "  Sans .env, deploy.sh refusera de lancer Docker (sécurité)."
echo_alert "════════════════════════════════════════════════════════════════"
echo ""
