# Mon Suivi Sportif

Application web de suivi santé et sportif — multi-profils, synchronisation Google Fit, assistant IA intégré.

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

```
Navigateur
    │  HTTPS
    ▼
Cloudflare Tunnel (suivi-sportif.fr)
    │
    ▼
nginx (VM Freebox, port 443)
    │  proxy /api/
    ▼
Node.js / Express (systemd, port 3001)
    │  pg (TCP 5432)
    ▼
PostgreSQL (VM Freebox BDD, 192.168.1.6)
```

- **Backend** Node.js / Express avec `pg` pour PostgreSQL
- **Base de données** PostgreSQL sur VM dédiée (Freebox Delta)
- **Données** stockées en base (tables `profiles` et `profile_data`)
- **Multi-profils** avec protection par code PIN (4 chiffres)
- **Accès public** via Cloudflare Tunnel — `https://suivi-sportif.fr`
- **Processus** géré par systemd (démarrage automatique)

---

## Structure des fichiers

```
mon-suivi-sportif/
├── index.html              # Toute la structure HTML (onglets, modals, bulle chat)
├── style.css               # Design system complet (CSS variables, responsive)
├── script.js               # Logique principale : profils, PIN, graphiques, utilitaires
├── server.js               # Serveur Express + routes API + proxy Anthropic
├── package.json            # Dépendances : express, pg
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
└── .github/
    └── workflows/
        └── deploy.yml      # Déploiement automatique via GitHub Actions
```

---

## Système de profils

Chaque profil dispose d'un espace de données totalement isolé en base de données.

- **Créer un profil** : bouton `+` dans le sélecteur en haut à droite
- **Changer de profil** : cliquer sur le nom du profil actif → menu déroulant
- **PIN** : chaque profil peut être protégé par un code à 4 chiffres
- **Données** : stockées dans PostgreSQL, table `profile_data` (clé/valeur JSON par profil)

---

## Google Fit — Import & Auto-sync

### Prérequis Google Cloud Console

1. Créer un projet sur [console.cloud.google.com](https://console.cloud.google.com)
2. Activer l'API **Fitness API**
3. Créer des identifiants OAuth 2.0 (type : "Application Web")
4. Ajouter dans **Origines JavaScript autorisées** :
   - `http://localhost:5500` (Live Server)
   - `https://suivi-sportif.fr` (production)
5. Copier le **Client ID** et le coller dans `importer/importer.js` (variable `CLIENT_ID`)

### Guard admin

L'onglet Importer est protégé : seul le compte Google dont l'adresse correspond à `adminEmail` (définie dans `importer.js`) peut y accéder.

### Auto-sync quotidien

À chaque ouverture de l'app, si un token Google Fit est présent, l'import se déclenche automatiquement depuis la dernière synchronisation jusqu'à aujourd'hui.

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
3. La clé est stockée dans localStorage

### Fonctionnement

- Modèle : **claude-haiku-4-5** (rapide, économique)
- Chaque requête inclut en contexte système : poids actuel, historique poids/sommeil/repas/séances
- Historique de conversation maintenu en mémoire pendant la session uniquement
- Les appels API transitent par le proxy `/api/ai` du serveur Express (clé Anthropic côté serveur)
- Raccourci : `Enter` pour envoyer, `Shift+Enter` pour un saut de ligne

---

## Installation

```bash
git clone https://github.com/Microskins/mon-suivi-sportif.git
cd mon-suivi-sportif
npm install
```

### Variables d'environnement

Créer un fichier `.env` à la racine (jamais commité) :

```env
PORT=3001
TOKEN=ton-token-secret
DB_PASSWORD=mot-de-passe-postgresql
DB_HOST=192.168.1.6
DB_NAME=suivi_sportif
DB_USER=suivi
ANTHROPIC_API_KEY=sk-ant-...
```

### Démarrage

```bash
node server.js
```

L'app est disponible sur `http://localhost:3001`.

---

## Déploiement production (Ubuntu + systemd + PostgreSQL)

### 1. Prérequis

- Ubuntu 24.04
- Node.js 22.x
- PostgreSQL sur VM dédiée (voir section BDD)

### 2. Cloner le projet

```bash
cd /var/www
git clone https://github.com/Microskins/mon-suivi-sportif.git
cd mon-suivi-sportif
npm install
```

### 3. Configurer les variables d'environnement

```bash
nano /var/www/mon-suivi-sportif/.env
```

```env
PORT=3001
TOKEN=ton-token-secret
DB_PASSWORD=mot-de-passe-postgresql
DB_HOST=192.168.1.6
ANTHROPIC_API_KEY=sk-ant-...
```

### 4. Créer le service systemd

Créer `/etc/systemd/system/mon-suivi-sportif.service` :

```ini
[Unit]
Description=Mon Suivi Sportif
After=network.target

[Service]
Type=simple
User=freebox
WorkingDirectory=/var/www/mon-suivi-sportif
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5
EnvironmentFile=/var/www/mon-suivi-sportif/.env

[Install]
WantedBy=multi-user.target
```

```bash
systemctl daemon-reload
systemctl enable mon-suivi-sportif
systemctl start mon-suivi-sportif
```

### 5. Configurer nginx

Créer `/etc/nginx/sites-available/mon-suivi-sportif` :

```nginx
server {
    listen 443 ssl;
    server_name suivi-sportif.fr;
    ssl_certificate     /etc/ssl/mon-suivi-sportif/fullchain.pem;
    ssl_certificate_key /etc/ssl/mon-suivi-sportif/privkey.pem;
    root /var/www/mon-suivi-sportif;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/mon-suivi-sportif /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

### 6. Configurer Cloudflare Tunnel

```bash
# Installer cloudflared (ARM64)
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64 -o /usr/local/bin/cloudflared
chmod +x /usr/local/bin/cloudflared

# Authentifier
cloudflared tunnel login

# Créer le tunnel
cloudflared tunnel create suivi-sportif
cloudflared tunnel route dns suivi-sportif suivi-sportif.fr
```

Créer `/root/.cloudflared/config.yml` :

```yaml
tunnel: <TUNNEL-ID>
credentials-file: /root/.cloudflared/<TUNNEL-ID>.json

ingress:
  - hostname: suivi-sportif.fr
    service: http://localhost:3001
  - service: http_status:404
```

```bash
cloudflared service install
systemctl enable cloudflared
systemctl start cloudflared
```

### 7. Mettre à jour

```bash
cd /var/www/mon-suivi-sportif
git pull origin master
systemctl restart mon-suivi-sportif
```

Le déploiement est automatisé via GitHub Actions (`.github/workflows/deploy.yml`).

---

## Base de données PostgreSQL

### Schéma

```sql
CREATE TABLE profiles (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    emoji       TEXT DEFAULT '💪',
    pin         TEXT,
    created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE profile_data (
    profile_id  TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    key         TEXT NOT NULL,
    value       JSONB NOT NULL,
    updated_at  TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (profile_id, key)
);
```

### API

| Méthode | Route | Description |
|---|---|---|
| `GET` | `/api/config` | Token public (pas d'auth requise) |
| `GET` | `/api/_global/profiles` | Liste tous les profils |
| `POST` | `/api/_global/profiles` | Sauvegarde les profils (upsert) |
| `GET` | `/api/:profileId` | Toutes les clés d'un profil |
| `GET` | `/api/:profileId/:key` | Lire une clé |
| `POST` | `/api/:profileId/:key` | Écrire une clé (upsert) |
| `POST` | `/api/ai` | Proxy Anthropic |

Toutes les routes (sauf `/api/config`) nécessitent le header `x-token`.

---

## Technologies

- **Vanilla JS** — aucune dépendance frontend, aucun bundler
- **Node.js / Express** — serveur backend
- **PostgreSQL** — base de données (via `pg`)
- **systemd** — gestion du processus Node.js
- **Cloudflare Tunnel** — accès public sécurisé sans exposition de ports
- **nginx** — reverse proxy HTTPS
- **Chart.js** (CDN) — graphiques
- **Google Identity Services** — OAuth 2.0 pour Google Fit
- **Anthropic API** — Claude Haiku pour le chatbot
- **CSS custom properties** — design system cohérent (couleur primaire `#6366f1`, police Inter)