#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
RESET='\033[0m'

echo_red() { echo -e "${RED}$*${RESET}" >&2; }
echo_green() { echo -e "${GREEN}$*${RESET}"; }

if [ -n "${1:-}" ]; then
  MESSAGE="$1"
else
  read -r -p "Message de commit: " MESSAGE
fi

if [ -z "${MESSAGE// }" ]; then
  echo_red "Erreur : le message de commit est vide."
  exit 1
fi

echo_green "→ Exécution de npm run build..."
if ! npm run build; then
  echo_red "Erreur : le build a échoué. Aucun commit ni push."
  exit 1
fi

echo_green "→ Build réussi. git add ."
git add .

echo_green "→ git commit -m \"${MESSAGE}\""
if ! git commit -m "$MESSAGE"; then
  echo_red "Erreur : git commit a échoué (rien à committer ou autre problème)."
  exit 1
fi

echo_green "→ git push origin main"
if ! git push origin main; then
  echo_red "Erreur : git push a échoué."
  exit 1
fi

echo_green "Terminé : changements poussés sur origin main."
