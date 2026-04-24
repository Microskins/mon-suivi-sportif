// ── Mon Suivi Sportif — Serveur (PostgreSQL) ─────────────────────────────────
// Lance avec : node server.js
// PORT         : variable d'env PORT (défaut 3001)
// TOKEN        : variable d'env TOKEN (défaut 'changeme' — À CHANGER)
// DB_PASSWORD  : variable d'env DB_PASSWORD (mot de passe PostgreSQL)
// DB_HOST      : variable d'env DB_HOST (défaut 192.168.1.6)
// ─────────────────────────────────────────────────────────────────────────────

const path = require('path');
const express = require('express');
const https   = require('https');
const { Pool } = require('pg');

const app           = express();
const PORT          = process.env.PORT          || 3001;
const TOKEN         = process.env.TOKEN         || 'changeme';
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || '';

// ── Connexion PostgreSQL ──────────────────────────────────────────────────────
const pool = new Pool({
    host:     process.env.DB_HOST     || '192.168.1.6',
    database: process.env.DB_NAME     || 'suivi_sportif',
    user:     process.env.DB_USER     || 'suivi',
    password: process.env.DB_PASSWORD,
    port:     process.env.DB_PORT     || 5432,
});

pool.connect()
    .then(() => console.log('PostgreSQL : ✓ connecté'))
    .catch(e => console.error('PostgreSQL : ✗ erreur de connexion', e.message));

app.use(express.static(path.join(__dirname)));
app.use(express.json({ limit: '5mb', strict: false }));

// ── Config publique (pas de token requis) ─────────────────────────────────────
app.get('/api/config', (req, res) => {
    res.json({ token: TOKEN });
});

// ── Authentification ──────────────────────────────────────────────────────────
app.use('/api', (req, res, next) => {
    if (req.headers['x-token'] !== TOKEN) {
        return res.status(401).json({ error: 'Token invalide' });
    }
    next();
});

// ── GET /api/_global/profiles — lire tous les profils ────────────────────────
app.get('/api/_global/profiles', async (req, res) => {
    try {
        const { rows } = await pool.query(
            'SELECT id, name, emoji, pin FROM profiles ORDER BY created_at ASC'
        );
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ── POST /api/_global/profiles — sauvegarder tous les profils ────────────────
app.post('/api/_global/profiles', async (req, res) => {
    const profiles = req.body;
    if (!Array.isArray(profiles)) {
        return res.status(400).json({ error: 'Tableau de profils attendu' });
    }
    try {
        for (const p of profiles) {
            await pool.query(`
                INSERT INTO profiles (id, name, emoji, pin)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (id) DO UPDATE
                    SET name  = EXCLUDED.name,
                        emoji = EXCLUDED.emoji,
                        pin   = EXCLUDED.pin
            `, [p.id, p.name || p.id, p.emoji || '💪', p.pin || null]);
        }
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ── GET /api/:profileId — toutes les clés d'un profil ────────────────────────
app.get('/api/:profileId', async (req, res) => {
    try {
        const { rows } = await pool.query(
            'SELECT key, value FROM profile_data WHERE profile_id = $1',
            [req.params.profileId]
        );
        const result = {};
        rows.forEach(r => result[r.key] = r.value);
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ── GET /api/:profileId/:key — lire une clé ───────────────────────────────────
app.get('/api/:profileId/:key', async (req, res) => {
    try {
        const { rows } = await pool.query(
            'SELECT value FROM profile_data WHERE profile_id = $1 AND key = $2',
            [req.params.profileId, req.params.key]
        );
        res.json(rows[0]?.value ?? null);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ── POST /api/:profileId/:key — écrire une clé (upsert) ──────────────────────
app.post('/api/:profileId/:key', async (req, res) => {
    try {
        await pool.query(`
            INSERT INTO profile_data (profile_id, key, value, updated_at)
            VALUES ($1, $2, $3, now())
            ON CONFLICT (profile_id, key) DO UPDATE
                SET value = EXCLUDED.value, updated_at = now()
        `, [req.params.profileId, req.params.key, JSON.stringify(req.body)]);
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ── POST /api/ai — proxy Anthropic ────────────────────────────────────────────
app.post('/api/ai', (req, res) => {
    if (!ANTHROPIC_KEY) {
        return res.status(503).json({ error: 'Clé Anthropic non configurée' });
    }
    const body = JSON.stringify(req.body);
    const options = {
        hostname: 'api.anthropic.com',
        path:     '/v1/messages',
        method:   'POST',
        headers: {
            'x-api-key':         ANTHROPIC_KEY,
            'anthropic-version': '2023-06-01',
            'content-type':      'application/json',
            'content-length':    Buffer.byteLength(body)
        }
    };
    const apiReq = https.request(options, (apiRes) => {
        let data = '';
        apiRes.on('data', chunk => data += chunk);
        apiRes.on('end', () => {
            try { res.status(apiRes.statusCode).json(JSON.parse(data)); }
            catch (_) { res.status(500).json({ error: 'Réponse invalide Anthropic' }); }
        });
    });
    apiReq.on('error', e => res.status(500).json({ error: e.message }));
    apiReq.write(body);
    apiReq.end();
});

app.listen(PORT, () => {
    console.log(`Mon Suivi Sportif — http://localhost:${PORT}`);
    console.log(`Token     : ${TOKEN === 'changeme' ? '⚠️  Token par défaut' : '✓ défini'}`);
    console.log(`Anthropic : ${ANTHROPIC_KEY ? '✓ défini' : '⚠️  ANTHROPIC_API_KEY manquant'}`);
});