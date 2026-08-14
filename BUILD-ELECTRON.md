# GESLO — Build Electron (Windows / Linux / macOS)

## 1. Prérequis
- Node.js installé (version 18 ou plus récente) : https://nodejs.org

## 2. Installation des dépendances
Ouvrir un terminal dans le dossier du projet (celui qui contient `package.json`), puis :

```
npm install
```

## 3. Tester l'application en local (avant de faire un .exe)
```
npm start
```
Cela ouvre GESLO dans une fenêtre Electron, exactement comme il se comportera une fois installé.

## 4. Générer les installateurs

Windows (.exe) :
```
npm run dist:win
```

macOS (.dmg) — doit être exécuté sur un Mac :
```
npm run dist:mac
```

Linux (.AppImage + .deb) :
```
npm run dist:linux
```

Tout générer d'un coup (nécessite d'être sur macOS pour la partie Mac) :
```
npm run dist:all
```

Les fichiers finaux (installateurs) apparaissent dans le dossier `dist/`.

## Notes importantes

- **Build croisé** : par convention Electron/electron-builder, on ne peut pas
  générer un .dmg (macOS) depuis Windows ou Linux — Apple l'interdit. Windows
  et Linux, eux, peuvent se construire depuis n'importe quel système.
  Le plus simple si vous n'avez pas de Mac : utiliser un service CI (GitHub
  Actions) ou demander à quelqu'un possédant un Mac de lancer `npm run dist:mac`.

- **Données locales** : GESLO stocke toutes ses données dans le
  `localStorage` du navigateur intégré à Electron. Une fois installé, cet
  espace de stockage est propre à l'application installée (dossier de
  données utilisateur du système), donc les données restent bien sur la
  machine d'un lancement à l'autre — comme décrit dans le README.

- **Licence** : la première activation nécessite toujours une connexion
  internet (appel à Supabase), exactement comme dans un navigateur normal.
  Une fois activée, l'app fonctionne hors-ligne.

- **Icônes** : les icônes (`build/icon.ico`, `build/icon.icns`,
  `build/icon.png`) ont été générées automatiquement à partir de
  `img/logo.png`. Vous pouvez les remplacer par vos propres fichiers si
  vous voulez un rendu plus précis (notamment le .ico et le .icns, qui
  gagnent à être faits à la main pour un rendu parfaitement net à toutes
  les tailles).
