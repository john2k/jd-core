#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RESET='\033[0m'

echo_red() { echo -e "${RED}$*${RESET}" >&2; }
echo_green() { echo -e "${GREEN}$*${RESET}"; }
echo_alert() { echo -e "${YELLOW}$*${RESET}" >&2; }

cd "$(dirname "$0")"

compose_cmd() {
  if docker compose version &>/dev/null 2>&1; then
    docker compose "$@"
  elif command -v docker-compose &>/dev/null; then
    docker-compose "$@"
  else
    echo_red "Erreur : ni « docker compose » ni « docker-compose » n'est disponible."
    exit 1
  fi
}

echo_green "→ git pull"
git pull

if [ ! -f .env ]; then
  echo_alert "ALERTE SÉCURITÉ : le fichier .env est absent à la racine du dépôt."
  echo_red "Créez un .env (ex. à partir de .env.example) avec vos secrets avant de déployer. Arrêt."
  exit 1
fi

echo_green "→ docker compose up --build -d"
compose_cmd up --build -d

echo_green "→ docker image prune -f"
docker image prune -f

echo_green "Déploiement terminé."
