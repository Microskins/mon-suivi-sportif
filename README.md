# Mon Suivi Sportif

Application web statique de suivi santé et sportif — multi-profils, synchronisation Google Fit, assistant IA intégré.

---

## Fonctionnalités

| Module | Ce qu'il fait |
|---|---|
| **Body** | Poids, tour de taille, taille, IMC calculé, historique avec graphique |
| **Sommeil** | Durée totale, phases (profond / REM / léger), IAH, BPM, SpO2, graphique empilé |
| **Repas** | 4 repas/jour (calories + macros), bilan calorique vs BMR |
| **Séances** | Durée, type, ressenti, kcal via valeurs MET, historique |
| **Accueil** | 3 graphiques Chart.js : évolution du poids, phases de sommeil, bilan calorique |
| **Importer** | Import Google Fit (poids, sommeil, activités) — protégé par compte Google admin |
| **Assistant IA** | Chatbot Claude Haiku en bulle flottante, contextualisé avec toutes tes données |

---

## Architecture

- **100 % statique** — aucun backend, aucune base de données
- **Données** stockées dans `localStorage`, isolées par profil
- **Multi-profils** avec protection par code PIN (4 chiffres)
- Fonctionne via Live Server (dev) ou serveur HTTP simple (prod)

---

## Structure des fichiers

```
mon-suivi-sportif/
├── index.html              # Toute la structure HTML (onglets, modals, bulle chat)
├── style.css               # Design system complet (CSS variables, responsive)
├── script.js               # Logique principale : profils, PIN, graphiques, utilitaires
│
├── body/
│   └── body.js             # Onglet données corporelles
├── sommeil/
│   └── sommeil.js          # Onglet sommeil
├── repas/
│   └── repas.js            # Onglet repas
├── sceances/
│   └── sceances.js         # Onglet séances
├── importer/
│   └── importer.js         # Import Google Fit + guard OAuth
├── assistant/
│   └── assistant.js        # Chatbot Claude Haiku
│
├── data/
│   ├── README.json         # Format de référence pour les fichiers de données
│   └── profile_{id}.json   # Données initiales par profil (seed au premier chargement)
│
└── .github/
    └── workflows/
        └── deploy.yml      # Déploiement automatique
```

---

## Système de profils

Chaque profil dispose d'un espace de données totalement isolé.

- **Créer un profil** : bouton `+` dans le sélecteur en haut à droite
- **Changer de profil** : cliquer sur le nom du profil actif → menu déroulant
- **PIN** : chaque profil peut être protégé par un code à 4 chiffres (clavier numérique ou clavier physique)
- **Données** : stockées sous les clés `profile_{id}_{clé}` dans localStorage — jamais mélangées entre profils

### Synchronisation des données initiales

Au premier chargement sur un appareil (localStorage vide), l'app cherche automatiquement un fichier `data/profile_{id}.json` sur le serveur. Si trouvé, les données sont chargées en local — pratique pour récupérer ses données d'un appareil à l'autre après un `git push`.

Pour exporter ses données actuelles vers ce fichier :
- Ouvrir la console du navigateur
- Appeler `exportProfileData('p_XXXXX')` (avec l'identifiant du profil)
- Récupérer le JSON téléchargé et le placer dans `data/`

---

## Google Fit — Import & Auto-sync

### Prérequis Google Cloud Console

1. Créer un projet sur [console.cloud.google.com](https://console.cloud.google.com)
2. Activer l'API **Fitness API**
3. Créer des identifiants OAuth 2.0 (type : "Application Web")
4. Ajouter dans **Origines JavaScript autorisées** :
   - `http://localhost:5500` (Live Server)
   - Ton URL de production (ex : `http://mon-suivis-sportif.freeboxos.fr:49152`)
5. Copier le **Client ID** et le coller dans `importer/importer.js` (variable `CLIENT_ID`)

### Guard admin

L'onglet Importer est protégé : seul le compte Google dont l'adresse correspond à `adminEmail` (définie dans `importer.js`) peut y accéder. Toute autre connexion est rejetée.

### Auto-sync quotidien

À chaque ouverture de l'app, si un token Google Fit est présent, l'import se déclenche automatiquement depuis la dernière synchronisation jusqu'à aujourd'hui — sans interaction.

Les données importées couvrent :
- Poids (`com.google.weight`)
- Sommeil (`com.google.sleep.segment`)
- Activités / séances (`com.google.activity.segment`)

---

## Assistant IA (Claude)

Un chatbot flottant (bulle en bas à droite) répond à des questions sur tes données personnelles.

### Configuration

1. Obtenir une clé API sur [console.anthropic.com](https://console.anthropic.com) → API Keys → Create Key
2. Cliquer sur la bulle 🤖 → saisir la clé (`sk-ant-…`) → "Sauvegarder"
3. La clé est stockée dans localStorage — elle n'a pas besoin d'être ressaisie

### Fonctionnement

- Modèle : **claude-haiku-4-5** (rapide, économique)
- Chaque requête inclut en contexte système : poids actuel, historique poids/sommeil/repas/séances
- Historique de conversation maintenu en mémoire pendant la session uniquement
- Raccourci : `Enter` pour envoyer, `Shift+Enter` pour un saut de ligne

---

## Installation locale (développement)

```bash
git clone https://github.com/<ton-compte>/mon-suivi-sportif.git
cd mon-suivi-sportif
# Ouvrir index.html avec Live Server (VS Code) ou :
npx serve .
```

L'app doit être servie via HTTP (pas `file://`) pour que les appels API Google Fit et Anthropic fonctionnent.

---

## Déploiement production

Le déploiement est automatisé via GitHub Actions (`.github/workflows/deploy.yml`).

L'app tourne actuellement sur un serveur Freebox : `http://mon-suivis-sportif.freeboxos.fr:49152`

---

## Technologies

- **Vanilla JS** — aucune dépendance npm, aucun bundler
- **Chart.js** (CDN) — graphiques
- **Google Identity Services** — OAuth 2.0 pour Google Fit
- **Anthropic API** — Claude Haiku pour le chatbot
- **CSS custom properties** — design system cohérent (couleur primaire `#6366f1`, police Inter)
