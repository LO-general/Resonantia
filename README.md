# TikTok Content Manager

Application complète (React + Vite + Tailwind CSS + Express TypeScript) dédiée à la création, l'analyse et la stratégie TikTok :

- **Étape 1 : Re-build** (`MaVisionPage`) — Philosophie éditoriale centrée sur l'émotion, la composition, le rôle de la musique et le respect du droit d'auteur.
- **Étape 2 : Parcours d'apprentissage vidéo** (`ComprendreInternetPage`) — Lecteur vidéo vertical 9:16, progression par utilisateur, gestion administrateur (`+ Ajouter une vidéo`, édition, réorganisation, suppression) et fiches fondamentales.
- **Mon Coach & TikTok Analytics** (`TikTokCoach`, `TikTokAnalytics`, `MonVisionnaire`, `MonRepostView`, `MusicAdvisorView`, `ComprendreTikTokHub`) — Moteurs analytiques et stratégiques déterministes, connexion TikTok OAuth 2.0 / Display API, planning et gestion des contenus.

## Prérequis

- **Node.js** 20+ (avec `npm`)

## Installation et lancement en local

1. Installer les dépendances :
   ```bash
   npm install
   ```

2. Configurer les variables d'environnement :
   ```bash
   cp .env.example .env
   ```
   Complétez `.env` avec vos clés (laissez vides les options non utilisées pour utiliser le mode local / déterministe) :
   - `APP_URL="http://localhost:3000"`
   - `GEMINI_API_KEY` *(optionnel — enrichissement IA côté serveur pour Content Creator & Coach)*
   - `TIKTOK_CLIENT_KEY` et `TIKTOK_CLIENT_SECRET` *(requis uniquement pour la connexion OAuth officielle TikTok)*

3. Démarrer le serveur de développement (Express + Vite sur le port `3000`) :
   ```bash
   npm run dev
   ```
   Ouvrez ensuite [http://localhost:3000](http://localhost:3000).

## Build de production et vérification

- Vérification TypeScript :
  ```bash
  npm run lint
  ```
- Compilation frontend (`dist/`) :
  ```bash
  npm run build
  ```
- Lancement en production :
  ```bash
  NODE_ENV=production npm start
  ```
- Exécution des tests unitaires :
  ```bash
  npx tsx --test tests/*.test.ts
  ```
