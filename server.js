// ── Mon Suivi Sportif — Serveur ──────────────────────────────────────────────
// Lance avec : node server.js
// PORT    : variable d'env PORT (défaut 49152)
// TOKEN   : variable d'env TOKEN (défaut 'changeme' — À CHANGER)
// Données : ./server-data/{profileId}/{key}.json
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const fs      = require('fs');
const path    = require('path');

const app      = express();
const PORT     = process.env.PORT  || 3001;
const TOKEN    = process.env.TOKEN || 'changeme';
const DATA_DIR = path.join(__dirname, 'server-data');

app.use(express.json({ limit: '5mb', strict: false }));

// ── Authentification ─────────────────────────────────────────────────────────
app.use('/api', (req, res, next) => {
    if (req.headers['x-token'] !== TOKEN) {
        return res.status(401).json({ error: 'Token invalide' });
    }
    next();
});

// ── GET /api/:profileId — toutes les clés d'un profil ────────────────────────
app.get('/api/:profileId', (req, res) => {
    const dir = path.join(DATA_DIR, req.params.profileId);
    if (!fs.existsSync(dir)) return res.json({});
    const result = {};
    fs.readdirSync(dir).forEach(file => {
        if (!file.endsWith('.json')) return;
        const key = file.slice(0, -5);
        try { result[key] = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')); }
        catch (_) {}
    });
    res.json(result);
});

// ── GET /api/:profileId/:key — lire une clé ──────────────────────────────────
app.get('/api/:profileId/:key', (req, res) => {
    const file = path.join(DATA_DIR, req.params.profileId, req.params.key + '.json');
    if (!fs.existsSync(file)) return res.json(null);
    try { res.json(JSON.parse(fs.readFileSync(file, 'utf8'))); }
    catch (_) { res.json(null); }
});

// ── POST /api/:profileId/:key — écrire une clé ───────────────────────────────
app.post('/api/:profileId/:key', (req, res) => {
    const dir  = path.join(DATA_DIR, req.params.profileId);
    const file = path.join(dir, req.params.key + '.json');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file, JSON.stringify(req.body));
    res.json({ ok: true });
});

app.listen(PORT, () => {
    console.log(`Mon Suivi Sportif — http://localhost:${PORT}`);
    console.log(`Token   : ${TOKEN === 'changeme' ? '⚠️  Token par défaut — pensez à définir TOKEN=xxx' : '✓ défini'}`);
    console.log(`Données : ${DATA_DIR}`);
});
