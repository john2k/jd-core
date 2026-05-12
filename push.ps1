Set-Location -Path $PSScriptRoot

npm run build
if ($LASTEXITCODE -ne 0) {
  Write-Host "Erreur : le build a échoué (code de sortie $LASTEXITCODE). Arrêt." -ForegroundColor Red
  exit 1
}

# git add . respecte .gitignore : .env non suivi n'est pas ajouté.
git add .
if ($LASTEXITCODE -ne 0) {
  Write-Host "Erreur : git add a échoué." -ForegroundColor Red
  exit 1
}

$staged = @(git diff --cached --name-only)
if ($staged.Count -eq 0) {
  Write-Host "Résumé : build OK — aucun fichier modifié à committer (rien à pousser)." -ForegroundColor Green
  exit 0
}

foreach ($path in $staged) {
  if ((Split-Path -Leaf $path) -eq ".env") {
    Write-Host "Erreur sécurité : le fichier .env est indexé. Annulation du staging (git reset HEAD)." -ForegroundColor Red
    Write-Host "Vérifiez que .env est bien dans .gitignore et qu'il n'a jamais été suivi par Git." -ForegroundColor Red
    git reset HEAD
    exit 1
  }
}

$culture = [System.Globalization.CultureInfo]::GetCultureInfo("fr-FR")
$dateHeure = (Get-Date).ToString("d MMMM yyyy 'à' HH:mm", $culture)
$fichiers = ($staged -join ", ")
$maxFichiers = 600
if ($fichiers.Length -gt $maxFichiers) {
  $fichiers = $fichiers.Substring(0, $maxFichiers).TrimEnd(",") + "…"
}

$commitMessage = "Auto-commit du $dateHeure - $fichiers"

$commitFile = [System.IO.Path]::GetTempFileName()
try {
  [System.IO.File]::WriteAllText($commitFile, $commitMessage, [System.Text.UTF8Encoding]::new($false))
  git commit -F $commitFile
} finally {
  Remove-Item -LiteralPath $commitFile -Force -ErrorAction SilentlyContinue
}

if ($LASTEXITCODE -ne 0) {
  Write-Host "Erreur : git commit a échoué." -ForegroundColor Red
  exit 1
}

git push
if ($LASTEXITCODE -ne 0) {
  Write-Host "Erreur : git push a échoué." -ForegroundColor Red
  exit 1
}

Write-Host "Résumé : build OK, commit auto créé, push effectué." -ForegroundColor Green
Write-Host "  Fichiers : $($staged.Count) fichier(s) — dernier message :" -ForegroundColor Green
Write-Host "  $commitMessage" -ForegroundColor Green
