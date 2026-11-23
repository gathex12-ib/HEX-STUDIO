# HEX-STUDIO Android

Dossier à plat : tous les fichiers sont au même niveau.

- `MainActivity.kt` : le code de l'app
- `AndroidManifest.xml` : la déclaration de l'app
- `index.html`, `style.css`, `script.js` : le site HEX-STUDIO affiché dans l'app
- `build.gradle.kts`, `settings.gradle.kts`, `gradle.properties` : la configuration de compilation

## APK avec GitHub
1. Envoie tous ces fichiers à la racine d'un dépôt GitHub (le dossier caché `.github` compris, GitHub exige ce chemin).
2. Actions > Build HEX-STUDIO APK > Run workflow.
3. Télécharge l'artefact `HEX-STUDIO-debug-APK`.

La structure Android standard (app/src/main/...) est créée automatiquement pendant la compilation sur GitHub. Elle n'apparaît pas dans ton dépôt.

## Mettre à jour le site
Remplace `index.html`, `style.css` et `script.js`, puis relance le workflow.
 
