// ============================================================
//  RAPPORT.JS — Rapport IA mensuel via proxy serveur
// ============================================================

(function () {

    const MODEL = 'claude-haiku-4-5-20251001';

    const SYSTEM_PROMPT = `Tu es un coach sportif et nutritionniste expert. Tu analyses les données de santé et de performance d'un athlète sur la période demandée. Tu dois fournir un rapport structuré, bienveillant et actionnable. Réponds UNIQUEMENT en JSON valide selon ce format :
{
  "resume": "string (2-3 phrases résumant la période)",
  "score_global": 75,
  "tendances": [
    { "categorie": "string", "icone": "string", "titre": "string", "observation": "string", "evolution": "hausse|baisse|stable" }
  ],
  "correlations": [
    { "titre": "string", "description": "string", "impact": "positif|negatif|neutre" }
  ],
  "alertes": [
    { "niveau": "info|warning|danger", "titre": "string", "detail": "string" }
  ],
  "recommandations": [
    { "priorite": 1, "titre": "string", "action": "string", "categorie": "string" }
  ],
  "point_positif": "string (encouragement personnalisé)"
}`;

    function currentProfileId() {
        return localStorage.getItem('currentProfileId') || '_default';
    }

    function loadData(key, def) {
        try {
            const raw = localStorage.getItem('profile_' + currentProfileId() + '_' + key);
            return raw ? JSON.parse(raw) : def;
        } catch (_) { return def; }
    }

    function saveData(key, data) {
        localStorage.setItem('profile_' + currentProfileId() + '_' + key, JSON.stringify(data));
    }

    function fmtMinutes(min) {
        if (!min) return '?';
        return Math.floor(min / 60) + 'h' + String(min % 60).padStart(2, '0');
    }

    // ── Collecte et formatage des données pour le prompt ─────────────────
    function buildUserPrompt(days) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        const iso = cutoff.toISOString().slice(0, 10);
        const today = new Date().toISOString().slice(0, 10);

        const bodyHistory   = loadData('bodyHistory', []).filter(e => e.date >= iso).sort((a, b) => a.date.localeCompare(b.date));
        const sommeilData   = loadData('sommeilData', []).filter(e => e.date >= iso).sort((a, b) => a.date.localeCompare(b.date));
        const seanceData    = loadData('seanceData', []).filter(e => e.date >= iso).sort((a, b) => b.date.localeCompare(a.date));
        const repasData     = loadData('repasData', []).filter(e => e.date >= iso);
        const mensurations  = loadData('mensurationsData', []).sort((a, b) => b.date.localeCompare(a.date));

        let prompt = `Analyse mes données sportives et santé sur les ${days} derniers jours (du ${iso} au ${today}).\n\n`;

        // Poids
        if (bodyHistory.length >= 2) {
            const debut = bodyHistory[0].poids;
            const fin   = bodyHistory[bodyHistory.length - 1].poids;
            const diff  = Math.round((fin - debut) * 10) / 10;
            prompt += `## Poids\nDébut de période : ${debut} kg | Fin : ${fin} kg | Variation : ${diff > 0 ? '+' : ''}${diff} kg\n\n`;
        } else if (bodyHistory.length === 1) {
            prompt += `## Poids\nMesure unique sur la période : ${bodyHistory[0].poids} kg\n\n`;
        } else {
            prompt += `## Poids\nAucune mesure sur la période.\n\n`;
        }

        // Sommeil
        if (sommeilData.length > 0) {
            const moyMin  = Math.round(sommeilData.reduce((s, e) => s + (e.tempsTotal || 0), 0) / sommeilData.length);
            const spo2Arr = sommeilData.filter(e => e.oxygen > 0);
            const bpmArr  = sommeilData.filter(e => e.bpm > 0);
            const moySpo2 = spo2Arr.length ? Math.round(spo2Arr.reduce((s, e) => s + e.oxygen, 0) / spo2Arr.length * 10) / 10 : null;
            const moyBpm  = bpmArr.length  ? Math.round(bpmArr.reduce((s, e) => s + e.bpm, 0)   / bpmArr.length) : null;
            prompt += `## Sommeil\n${sommeilData.length} nuits enregistrées | Durée moyenne : ${fmtMinutes(moyMin)}`;
            if (moySpo2) prompt += ` | SpO2 moyen : ${moySpo2}%`;
            if (moyBpm)  prompt += ` | BPM repos moyen : ${moyBpm}`;
            prompt += '\n';
            const dernières = [...sommeilData].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7);
            prompt += 'Détail 7 dernières nuits :\n';
            dernières.forEach(e => {
                prompt += `- ${e.date} : ${fmtMinutes(e.tempsTotal)}`;
                if (e.rem)    prompt += ` | REM: ${fmtMinutes(e.rem)}`;
                if (e.profond) prompt += ` | Profond: ${fmtMinutes(e.profond)}`;
                prompt += '\n';
            });
            prompt += '\n';
        } else {
            prompt += `## Sommeil\nAucune donnée sur la période.\n\n`;
        }

        // Séances
        if (seanceData.length > 0) {
            const typeLabels = { musculation: 'Musculation', cardio: 'Cardio', hiit: 'HIIT', yoga: 'Yoga', 'sport-co': 'Sport co', autre: 'Autre' };
            const ressMoy = Math.round(seanceData.filter(e => e.ressenti).reduce((s, e) => s + e.ressenti, 0) / seanceData.filter(e => e.ressenti).length * 10) / 10;
            const types = [...new Set(seanceData.map(e => typeLabels[e.type] || e.type))].join(', ');
            prompt += `## Séances\n${seanceData.length} séances | Ressenti moyen : ${ressMoy || '?'}/5 | Types : ${types}\n`;
            prompt += 'Détail 5 dernières :\n';
            seanceData.slice(0, 5).forEach(e => {
                prompt += `- ${e.date} : ${typeLabels[e.type] || e.type}, ${e.duree || '?'} min, ${e.kcal || '?'} kcal (ressenti ${e.ressenti || '?'}/5)\n`;
            });
            prompt += '\n';
        } else {
            prompt += `## Séances\nAucune séance sur la période.\n\n`;
        }

        // Repas
        if (repasData.length > 0) {
            const MEAL_KEYS = ['petitDejeuner', 'dejeuner', 'collation', 'diner'];
            const totalCal = repasData.reduce((s, j) => s + MEAL_KEYS.reduce((ss, k) => ss + (j[k]?.calories || 0), 0), 0);
            const moyCal = Math.round(totalCal / repasData.length);
            prompt += `## Repas\n${repasData.length} jours enregistrés | Calories moyennes : ${moyCal} kcal/jour\n\n`;
        } else {
            prompt += `## Repas\nAucune donnée sur la période.\n\n`;
        }

        // Mensurations
        if (mensurations.length > 0) {
            const last = mensurations[0];
            prompt += `## Dernières mensurations (${last.date})\n`;
            if (last.poitrine) prompt += `Poitrine: ${last.poitrine} cm | `;
            if (last.tailleMens) prompt += `Taille: ${last.tailleMens} cm | `;
            if (last.hanches)  prompt += `Hanches: ${last.hanches} cm | `;
            if (last.biceps)   prompt += `Biceps: ${last.biceps} cm`;
            prompt += '\n';
        }

        return prompt;
    }

    // ── Rendu HTML du rapport ─────────────────────────────────────────────
    function scoreColor(score) {
        if (score >= 75) return '#10b981';
        if (score >= 50) return '#f59e0b';
        return '#ef4444';
    }

    function renderRapport(data, period) {
        const el = document.getElementById('rapportContent');
        if (!el) return;

        const score = data.score_global || 0;
        let html = '';

        // Score + résumé
        html += `<div class="rapport-score-header">
            <div class="rapport-score-circle" style="background:${scoreColor(score)}">${score}</div>
            <div class="rapport-resume">${data.resume || ''}</div>
        </div>`;

        // Tendances
        if (data.tendances && data.tendances.length) {
            const arrows = { hausse: '↑', baisse: '↓', stable: '→' };
            const arrowColors = { hausse: '#10b981', baisse: '#ef4444', stable: '#64748b' };
            html += `<div class="rapport-section"><h3>Tendances</h3><div class="tendance-grid">`;
            data.tendances.forEach(t => {
                const arr = arrows[t.evolution] || '→';
                const col = arrowColors[t.evolution] || '#64748b';
                html += `<div class="tendance-card">
                    <div class="tendance-card-header">
                        <span class="tendance-icone">${t.icone || '📊'}</span>
                        <span class="tendance-evolution" style="color:${col}">${arr}</span>
                    </div>
                    <div class="tendance-titre">${t.categorie || t.titre}</div>
                    <div class="tendance-observation">${t.observation}</div>
                </div>`;
            });
            html += `</div></div>`;
        }

        // Corrélations
        if (data.correlations && data.correlations.length) {
            html += `<div class="rapport-section"><h3>Corrélations observées</h3><div class="correlation-list">`;
            data.correlations.forEach(c => {
                const cls = c.impact === 'positif' ? 'badge-positif' : c.impact === 'negatif' ? 'badge-negatif' : 'badge-neutre';
                const label = c.impact === 'positif' ? '+ positif' : c.impact === 'negatif' ? '- négatif' : 'neutre';
                html += `<div class="correlation-item">
                    <span class="correlation-badge ${cls}">${label}</span>
                    <div class="correlation-content">
                        <div class="correlation-titre">${c.titre}</div>
                        <div class="correlation-desc">${c.description}</div>
                    </div>
                </div>`;
            });
            html += `</div></div>`;
        }

        // Alertes
        if (data.alertes && data.alertes.length) {
            html += `<div class="rapport-section"><h3>Points d'attention</h3>`;
            data.alertes.forEach(a => {
                html += `<div class="alerte-card alerte-${a.niveau || 'info'}">
                    <div class="alerte-titre">${a.titre}</div>
                    <div class="alerte-detail">${a.detail}</div>
                </div>`;
            });
            html += `</div>`;
        }

        // Recommandations
        if (data.recommandations && data.recommandations.length) {
            const sorted = [...data.recommandations].sort((a, b) => (a.priorite || 99) - (b.priorite || 99));
            html += `<div class="rapport-section"><h3>Recommandations</h3><div class="reco-list">`;
            sorted.forEach((r, i) => {
                html += `<div class="reco-item">
                    <div class="reco-num">${i + 1}</div>
                    <div class="reco-content">
                        <div class="reco-titre">${r.titre}<span class="reco-categorie">${r.categorie || ''}</span></div>
                        <div class="reco-action">${r.action}</div>
                    </div>
                </div>`;
            });
            html += `</div></div>`;
        }

        // Point positif
        if (data.point_positif) {
            html += `<div class="rapport-section">
                <div class="point-positif-card">✨ ${data.point_positif}</div>
            </div>`;
        }

        el.innerHTML = html;
        el.style.display = 'block';
    }

    // ── Historique des rapports ────────────────────────────────────────────
    function renderHistorique() {
        const list = document.getElementById('rapportHistoryList');
        if (!list) return;
        const rapports = loadData('rapports', []);
        if (!rapports.length) {
            list.innerHTML = '<p style="font-size:13px;color:var(--text-3)">Aucun rapport généré pour le moment.</p>';
            return;
        }
        const periodeLabel = { '7': '7 jours', '30': '30 jours', '90': '3 mois' };
        list.innerHTML = rapports.map((r, i) =>
            `<div class="rapport-history-item" data-idx="${i}">
                <div>
                    <div class="rapport-history-date">${new Date(r.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                    <div class="rapport-history-meta">Période : ${periodeLabel[r.period] || r.period + ' jours'}</div>
                </div>
                <div class="rapport-history-score">${r.score}</div>
            </div>`
        ).join('');

        list.querySelectorAll('.rapport-history-item').forEach(el => {
            el.addEventListener('click', () => {
                const idx = parseInt(el.dataset.idx);
                const r = rapports[idx];
                if (r && r.data) {
                    renderRapport(r.data, r.period);
                    document.getElementById('rapportContent').scrollIntoView({ behavior: 'smooth' });
                }
            });
        });
    }

    // ── Génération du rapport ─────────────────────────────────────────────
    async function genererRapport() {
        const token = localStorage.getItem('serverToken');
        const apiWrap  = document.getElementById('rapportApiKeyWrap');
        const loading  = document.getElementById('rapportLoading');
        const content  = document.getElementById('rapportContent');
        const btn      = document.getElementById('btnGenererRapport');

        if (!token) {
            if (apiWrap) { apiWrap.style.display = 'block'; }
            return;
        }
        if (apiWrap) apiWrap.style.display = 'none';

        const days = parseInt(document.getElementById('rapportPeriod')?.value || '30');

        content.style.display  = 'none';
        loading.style.display  = 'flex';
        btn.disabled = true;

        try {
            const userPrompt = buildUserPrompt(days);
            const response = await fetch('/api/ai', {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    'x-token': token
                },
                body: JSON.stringify({
                    model:      MODEL,
                    max_tokens: 2000,
                    system:     SYSTEM_PROMPT,
                    messages:   [{ role: 'user', content: userPrompt }]
                })
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                const msg = err?.error?.message || `Erreur ${response.status}`;
                content.style.display = 'block';
                content.innerHTML = `<div class="alerte-card alerte-danger"><div class="alerte-titre">Erreur API</div><div class="alerte-detail">${msg}</div></div>`;
                return;
            }

            const apiData = await response.json();
            const rawText = apiData.content?.[0]?.text || '';
            const cleaned = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

            let parsed;
            try {
                parsed = JSON.parse(cleaned);
            } catch (_) {
                content.style.display = 'block';
                content.innerHTML = `<div class="alerte-card alerte-warning"><div class="alerte-titre">Erreur de format</div><div class="alerte-detail">La réponse de Claude n'est pas du JSON valide. Réessaie.</div></div>`;
                return;
            }

            renderRapport(parsed, days);

            // Sauvegarder (max 6)
            const rapports = loadData('rapports', []);
            rapports.unshift({
                date:   new Date().toISOString(),
                period: String(days),
                score:  parsed.score_global || 0,
                data:   parsed
            });
            saveData('rapports', rapports.slice(0, 6));
            renderHistorique();

        } catch (e) {
            content.style.display = 'block';
            content.innerHTML = `<div class="alerte-card alerte-danger"><div class="alerte-titre">Erreur réseau</div><div class="alerte-detail">${e.message}</div></div>`;
        } finally {
            loading.style.display = 'none';
            btn.disabled = false;
        }
    }

    // ── Init ──────────────────────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', function () {
        const btn = document.getElementById('btnGenererRapport');
        if (btn) btn.addEventListener('click', genererRapport);
        window.addEventListener('suivi:dataChanged', renderHistorique);
        renderHistorique();
    });

})();
