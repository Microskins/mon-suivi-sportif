// ============================================================
//  SCRIPT.JS — Onglets + graphique récapitulatif + utilitaires
//  Tout le HTML est inline dans index.html (pas de fetch)
// ============================================================

document.addEventListener('DOMContentLoaded', function () {

    // ── Gestion des onglets ──────────────────────────────────
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    const PAGE_TITLES = {
        accueil:   'Vue d\'ensemble',
        body:      'Body',
        sommeil:   'Sommeil',
        repas:     'Repas',
        sceances:  'Séances',
        programme: 'Programme',
        objectifs: 'Objectifs',
        nutrition: 'Nutrition',
        importer:  'Importer / Exporter',
        apparence: 'Apparence',
        rapport:   'Rapport IA',
        defis:     'Défis'
    };

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');

            tabContents.forEach(c => c.classList.remove('active'));
            tabButtons.forEach(b => b.classList.remove('active'));

            document.getElementById(tabId).classList.add('active');
            button.classList.add('active');

            const titleEl = document.getElementById('pageTitle');
            if (titleEl) titleEl.textContent = PAGE_TITLES[tabId] || tabId;

            const filters = document.getElementById('periodFilters');
            if (filters) filters.classList.toggle('hidden', tabId !== 'accueil');

            if (tabId === 'accueil') updateDashboard();
        });
    });

    // ── Filtres de période ───────────────────────────────────
    let activePeriod = 7;

    document.querySelectorAll('.period-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activePeriod = parseInt(btn.dataset.days);
            updateDashboard();
        });
    });

    // ── Graphiques récapitulatifs ────────────────────────────
    const charts = { poids: null, sommeil: null, calories: null };

    function destroyChart(key) {
        if (charts[key]) { charts[key].destroy(); charts[key] = null; }
    }

    function emptyCard(canvasId, msg) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const card = canvas.parentElement;
        canvas.style.display = 'none';
        if (!card.querySelector('.chart-empty')) {
            const p = document.createElement('p');
            p.className = 'chart-empty';
            p.textContent = msg;
            card.appendChild(p);
        }
    }

    function showCanvas(canvasId) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        canvas.style.display = 'block';
        const empty = canvas.parentElement.querySelector('.chart-empty');
        if (empty) empty.remove();
    }

    function updateRecapChart() {
        const sommeilData = JSON.parse(localStorage.getItem('sommeilData')) || [];
        const repasData   = JSON.parse(localStorage.getItem('repasData'))   || [];
        const seanceData  = JSON.parse(localStorage.getItem('seanceData'))  || [];
        const bodyHistory = JSON.parse(localStorage.getItem('bodyHistory')) || [];

        // ── 1. Graphique Poids ───────────────────────────────
        destroyChart('poids');
        if (bodyHistory.length < 1) {
            emptyCard('chartPoids', 'Aucune donnée de poids');
        } else {
            showCanvas('chartPoids');
            const sorted = [...bodyHistory].filter(e => e.poids != null && !isNaN(e.poids)).sort((a, b) => a.date.localeCompare(b.date));
            charts.poids = new Chart(document.getElementById('chartPoids'), {
                type: 'line',
                data: {
                    labels: sorted.map(e => e.date),
                    datasets: [{
                        label: 'Poids (kg)',
                        data: sorted.map(e => e.poids),
                        borderColor: '#e53e3e',
                        backgroundColor: 'rgba(229,62,62,0.1)',
                        tension: 0.3,
                        pointRadius: 4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { title: { display: true, text: 'kg' } }
                    }
                }
            });
        }

        // ── 2. Graphique Sommeil ─────────────────────────────
        destroyChart('sommeil');
        if (sommeilData.length < 1) {
            emptyCard('chartSommeil', 'Aucune donnée de sommeil');
        } else {
            showCanvas('chartSommeil');
            const sorted = [...sommeilData].sort((a, b) => a.date.localeCompare(b.date));
            const toH = min => min ? +(min / 60).toFixed(1) : 0;
            charts.sommeil = new Chart(document.getElementById('chartSommeil'), {
                type: 'bar',
                data: {
                    labels: sorted.map(e => e.date),
                    datasets: [
                        {
                            label: 'Profond',
                            data: sorted.map(e => toH(e.profond)),
                            backgroundColor: '#4c51bf'
                        },
                        {
                            label: 'REM',
                            data: sorted.map(e => toH(e.rem)),
                            backgroundColor: '#9f7aea'
                        },
                        {
                            label: 'Léger',
                            data: sorted.map(e => toH(e.leger)),
                            backgroundColor: '#b794f4'
                        },
                        {
                            label: 'Total (si non décomposé)',
                            data: sorted.map(e => (e.profond || e.rem || e.leger) ? 0 : toH(e.tempsTotal)),
                            backgroundColor: '#e9d8fd'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    plugins: { legend: { position: 'bottom', labels: { boxWidth: 12 } } },
                    scales: {
                        x: { stacked: true },
                        y: { stacked: true, title: { display: true, text: 'heures' } }
                    }
                }
            });
        }

        // ── 3. Graphique Bilan calorique global ──────────────
        destroyChart('calories');
        const dateSet = new Set([
            ...repasData.map(r => r.date),
            ...seanceData.map(s => s.date)
        ]);
        const dates = [...dateSet].sort();

        if (dates.length < 1) {
            emptyCard('chartCalories', 'Aucune donnée calorique');
        } else {
            showCanvas('chartCalories');

            // ── Calcul du BMR (Mifflin-St Jeor, neutre) ──────
            const settings = JSON.parse(localStorage.getItem('bodySettings') || 'null');
            let bmr = 0;
            if (settings?.poids && settings?.taille && settings?.age) {
                const ageParsed = new Date(settings.age);
                const age = new Date().getFullYear() - ageParsed.getFullYear();
                // Formule neutre (moyenne homme/femme)
                bmr = Math.round(10 * settings.poids + 6.25 * settings.taille - 5 * age - 78);
            }

            // ── Données ───────────────────────────────────────
            // repasData est maintenant un tableau de journées {date, petitDejeuner, dejeuner, ...}
            const MEAL_KEYS = ['petitDejeuner', 'dejeuner', 'collation', 'diner'];
            const kcalMangees = dates.map(d => {
                const jour = repasData.find(r => r.date === d);
                if (!jour) return 0;
                // Nouveau format (objet par repas)
                if (jour.petitDejeuner !== undefined || jour.dejeuner !== undefined) {
                    return MEAL_KEYS.reduce((s, k) => s + (jour[k]?.calories || 0), 0);
                }
                // Ancien format (entrées individuelles avec .calories)
                return jour.calories || 0;
            });

            const kcalSport = dates.map(d =>
                seanceData.filter(s => s.date === d).reduce((s, r) => s + (r.kcal || 0), 0)
            );

            // Bilan = mangées - sport - BMR
            const bilan = dates.map((_, i) => kcalMangees[i] - kcalSport[i] - bmr);

            // Couleur des barres : rouge = surplus, vert = déficit
            const barColors = bilan.map(v => v > 0
                ? 'rgba(229,62,62,0.75)'
                : 'rgba(72,187,120,0.75)'
            );

            const subtitle = bmr
                ? `BMR estimé : ${bmr} kcal/j · Vert = déficit · Rouge = surplus`
                : 'Renseigne Body pour inclure ton métabolisme de base';

            charts.calories = new Chart(document.getElementById('chartCalories'), {
                type: 'bar',
                data: {
                    labels: dates,
                    datasets: [
                        {
                            label: 'Bilan net (mangées − sport − BMR)',
                            data: bilan,
                            backgroundColor: barColors,
                            borderRadius: 4,
                            order: 2
                        },
                        {
                            // Ligne de référence à 0
                            label: 'Équilibre',
                            data: dates.map(() => 0),
                            type: 'line',
                            borderColor: 'rgba(0,0,0,0.25)',
                            borderDash: [6, 4],
                            borderWidth: 1,
                            pointRadius: 0,
                            order: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { display: false },
                        subtitle: {
                            display: true,
                            text: subtitle,
                            color: '#718096',
                            font: { size: 12 },
                            padding: { bottom: 8 }
                        },
                        tooltip: {
                            callbacks: {
                                afterBody: (items) => {
                                    const i = items[0].dataIndex;
                                    return [
                                        `Mangées : ${kcalMangees[i]} kcal`,
                                        `Sport   : ${kcalSport[i]} kcal`,
                                        bmr ? `BMR     : ${bmr} kcal` : ''
                                    ].filter(Boolean);
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            title: { display: true, text: 'kcal' },
                            grid: { color: ctx => ctx.tick.value === 0 ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.06)' }
                        }
                    }
                }
            });
        }
    }

    // ── Score de forme hebdomadaire ──────────────────────────

    function calculateScoreHebdo() {
        const cutoff = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
        const sommeilData = loadData('sommeilData').filter(e => e.date >= cutoff);
        const seanceData  = loadData('seanceData').filter(e => e.date >= cutoff);
        const repasData   = loadData('repasData').filter(e => e.date >= cutoff);
        const MEAL_KEYS   = ['petitDejeuner', 'dejeuner', 'collation', 'diner'];

        // ── Sommeil (40 pts + 5 bonus SpO2) ─────────────────
        let ptsSommeil = 0;
        if (sommeilData.length > 0) {
            const avgMin = sommeilData.reduce((s, e) => {
                return s + (e.tempsTotal || (e.profond || 0) + (e.rem || 0) + (e.leger || 0));
            }, 0) / sommeilData.length;
            const avgH = avgMin / 60;
            if (avgH >= 8)      ptsSommeil = 40;
            else if (avgH >= 6) ptsSommeil = Math.round(20 + (avgH - 6) / 2 * 20);
            else if (avgH >= 5) ptsSommeil = Math.round((avgH - 5) * 20);
            else                ptsSommeil = 0;
            const withO2 = sommeilData.filter(e => e.oxygen);
            if (withO2.length > 0) {
                const avgO2 = withO2.reduce((s, e) => s + e.oxygen, 0) / withO2.length;
                if (avgO2 > 95) ptsSommeil += 5;
            }
        }

        // ── Séances (35 pts + 5 bonus ressenti) ─────────────
        let ptsSeances = 0;
        const nb = seanceData.length;
        if      (nb >= 3) ptsSeances = 35;
        else if (nb === 2) ptsSeances = 25;
        else if (nb === 1) ptsSeances = 12;
        if (nb > 0) {
            const avgRessenti = seanceData.reduce((s, e) => s + (e.ressenti || 3), 0) / nb;
            if (avgRessenti >= 4) ptsSeances += 5;
        }

        // ── Nutrition (25 pts) ───────────────────────────────
        let ptsNutrition = 0;
        const joursAvecCal = repasData.filter(jour =>
            MEAL_KEYS.reduce((s, k) => s + (jour[k]?.calories || 0), 0) > 0
        ).length;
        if      (joursAvecCal >= 5) ptsNutrition = 25;
        else if (joursAvecCal >= 3) ptsNutrition = 15;
        else if (joursAvecCal >= 1) ptsNutrition = 8;

        const total = Math.min(100, ptsSommeil + ptsSeances + ptsNutrition);
        const result = { total, ptsSommeil, ptsSeances, ptsNutrition, date: new Date().toISOString().split('T')[0] };
        saveData('scoreHebdo', result);
        return result;
    }

    function renderScoreHebdo() {
        const el = document.getElementById('scoreHebdoCard');
        if (!el) return;
        const score = calculateScoreHebdo();

        // Couleur selon score
        const color = score.total <= 40 ? '#ef4444'
                    : score.total <= 65 ? '#f97316'
                    : score.total <= 85 ? '#6366f1'
                    :                    '#10b981';
        const label = score.total <= 40 ? 'Insuffisant'
                    : score.total <= 65 ? 'Correct'
                    : score.total <= 85 ? 'Bon'
                    :                    'Excellent';

        // Jauge SVG — circumference ≈ 314
        const circ = 314;
        const offset = circ - (score.total / 100) * circ;
        const fill = document.getElementById('gaugeFill');
        if (fill) { fill.style.stroke = color; fill.style.strokeDashoffset = offset; }

        const valEl = document.getElementById('scoreValue');
        if (valEl) valEl.textContent = score.total;

        const lblEl = document.getElementById('scoreLabel');
        if (lblEl) { lblEl.textContent = label; lblEl.style.color = color; }

        // Mini-indicateurs
        const maxS = 45, maxSe = 40, maxN = 25;
        const setBar = (barId, ptsId, pts, max) => {
            const bar = document.getElementById(barId);
            const pt  = document.getElementById(ptsId);
            if (bar) bar.style.width = Math.min(100, (pts / max) * 100) + '%';
            if (pt)  pt.textContent = `${pts}/${max}`;
        };
        setBar('scoreBarSommeil',   'scorePtsSommeil',   score.ptsSommeil,   maxS);
        setBar('scoreBarSeances',   'scorePtsSeances',   score.ptsSeances,   maxSe);
        setBar('scoreBarNutrition', 'scorePtsNutrition', score.ptsNutrition, maxN);

        // Couleur des barres
        ['scoreBarSommeil','scoreBarSeances','scoreBarNutrition'].forEach(id => {
            const b = document.getElementById(id);
            if (b) b.style.background = color;
        });
    }

    // ── Dashboard ────────────────────────────────────────────

    function updateDashboard() {
        const bodyHistory  = JSON.parse(localStorage.getItem('bodyHistory')  || '[]');
        const bodySettings = JSON.parse(localStorage.getItem('bodySettings') || 'null');
        const sommeilData  = JSON.parse(localStorage.getItem('sommeilData')  || '[]');
        const repasData    = JSON.parse(localStorage.getItem('repasData')    || '[]');
        const seanceData   = JSON.parse(localStorage.getItem('seanceData')   || '[]');

        const cutoff = new Date(Date.now() - activePeriod * 86400000).toISOString().split('T')[0];

        function setCard(id, value, sub, fillPct) {
            const card = document.getElementById(id);
            if (!card) return;
            card.querySelector('.dsc-value').textContent = value;
            card.querySelector('.dsc-sub').textContent   = sub;
            const fill = card.querySelector('.dsc-fill');
            if (fill) fill.style.width = Math.min(100, Math.max(0, fillPct || 0)) + '%';
        }

        // ── Poids ────────────────────────────────────────────
        if (bodyHistory.length > 0) {
            const sorted = [...bodyHistory].sort((a, b) => b.date.localeCompare(a.date));
            const latest = sorted[0];
            const prev   = sorted[1];
            const diff   = prev ? (latest.poids - prev.poids).toFixed(1) : null;
            const sub    = diff === null
                ? 'Première entrée'
                : (+diff > 0 ? `▲ +${diff} kg vs précédent` : +diff < 0 ? `▼ ${diff} kg vs précédent` : '= stable');
            setCard('dashPoids', `${latest.poids} kg`, sub, (latest.poids / 150) * 100);
        }

        // ── IMC ──────────────────────────────────────────────
        if (bodySettings?.poids && bodySettings?.taille) {
            const imc = bodySettings.poids / Math.pow(bodySettings.taille / 100, 2);
            let cat = imc < 18.5 ? 'Insuffisance pondérale'
                    : imc < 25   ? 'Poids normal'
                    : imc < 30   ? 'Surpoids'
                    :              'Obésité';
            setCard('dashImc', imc.toFixed(1), cat, ((imc - 15) / 25) * 100);
        }

        // ── Sommeil ──────────────────────────────────────────
        const sommeilFiltered = sommeilData.filter(e => e.date >= cutoff);
        if (sommeilFiltered.length > 0) {
            const avgMin = sommeilFiltered.reduce((s, e) => {
                const t = e.tempsTotal || ((e.profond || 0) + (e.rem || 0) + (e.leger || 0));
                return s + t;
            }, 0) / sommeilFiltered.length;
            const h = Math.floor(avgMin / 60);
            const m = Math.round(avgMin % 60);
            const n = sommeilFiltered.length;
            setCard('dashSommeil', `${h}h${String(m).padStart(2,'0')}`,
                `Moy. sur ${n} nuit${n > 1 ? 's' : ''}`, (avgMin / 540) * 100);
        }

        // ── Calories ─────────────────────────────────────────
        const MEAL_KEYS = ['petitDejeuner', 'dejeuner', 'collation', 'diner'];
        const repasFiltered = repasData.filter(e => e.date >= cutoff);
        let bmr = 0;
        if (bodySettings?.poids && bodySettings?.taille && bodySettings?.age) {
            const age = new Date().getFullYear() - new Date(bodySettings.age).getFullYear();
            bmr = Math.round(10 * bodySettings.poids + 6.25 * bodySettings.taille - 5 * age - 78);
        }
        if (repasFiltered.length > 0) {
            const avgCal = repasFiltered.reduce((s, jour) => {
                const cal = (jour.petitDejeuner !== undefined || jour.dejeuner !== undefined)
                    ? MEAL_KEYS.reduce((a, k) => a + (jour[k]?.calories || 0), 0)
                    : (jour.calories || 0);
                return s + cal;
            }, 0) / repasFiltered.length;
            setCard('dashCalories', `${Math.round(avgCal)} kcal`,
                bmr ? `BMR : ${bmr} kcal/j` : 'Renseigne tes données Body',
                (avgCal / 3000) * 100);
        } else if (bmr) {
            setCard('dashCalories', '—', `BMR : ${bmr} kcal/j`, 0);
        }

        // ── Séances récentes ─────────────────────────────────
        const seanceEl = document.getElementById('dashSeances');
        if (seanceEl) {
            const recent = [...seanceData].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
            if (recent.length === 0) {
                seanceEl.innerHTML = '<p class="chart-empty">Aucune séance enregistrée</p>';
            } else {
                const TYPE_COLORS = {
                    musculation: '#e53e3e', cardio: '#48bb78', yoga: '#9f7aea',
                    hiit: '#f6ad55', natation: '#4299e1', 'sport-co': '#ed8936',
                    vélo: '#ed8936', velo: '#ed8936', course: '#48bb78',
                    stretching: '#b794f4', autre: '#718096',
                };
                seanceEl.innerHTML = recent.map(s => {
                    const type  = (s.type || '').toLowerCase();
                    const color = TYPE_COLORS[type] || '#718096';
                    const duree = s.duree ? `${s.duree} min` : '';
                    const kcal  = s.kcal  ? `${s.kcal} kcal` : '';
                    const note  = s.ressenti ? `· ${s.ressenti}/5 ☆` : '';
                    const meta  = [duree, note].filter(Boolean).join(' ');
                    return `<div class="dash-seance-item">
                        <span class="dsi-dot" style="background:${color}"></span>
                        <div class="dsi-info">
                            <div class="dsi-name">${s.date}</div>
                            ${meta ? `<div class="dsi-meta">${meta}</div>` : ''}
                        </div>
                        <div class="dsi-right">
                            <span class="dsi-type">${s.type || '—'}</span>
                            ${kcal ? `<span class="dsi-kcal">${kcal}</span>` : ''}
                        </div>
                    </div>`;
                }).join('');
            }
        }

        // ── Score de forme ───────────────────────────────────
        renderScoreHebdo();

        // ── Derniers records battus ──────────────────────────
        window.renderDashRecords?.();

        // ── Objectifs actifs ─────────────────────────────────
        const dashObjEl = document.getElementById('dashObjectifs');
        if (dashObjEl) {
            const objectifs = loadData('objectifs', []);
            const actifs = objectifs.filter(o => o.actif && !o.atteint)
                .sort((a, b) => {
                    if (!a.dateFin && !b.dateFin) return 0;
                    if (!a.dateFin) return 1;
                    if (!b.dateFin) return -1;
                    return a.dateFin.localeCompare(b.dateFin);
                }).slice(0, 3);
            if (actifs.length === 0) {
                dashObjEl.innerHTML = '<p class="chart-empty">Aucun objectif actif — crée-en un dans l\'onglet Objectifs</p>';
            } else {
                dashObjEl.innerHTML = actifs.map(o => {
                    const dir = o.direction || 'max';
                    let pct;
                    if (dir === 'min') {
                        const depart = o.valeurDepart ?? o.valeurActuelle;
                        const range  = depart - o.valeurCible;
                        pct = !range ? (o.valeurActuelle <= o.valeurCible ? 100 : 0)
                                     : Math.max(0, Math.min(100, Math.round(((depart - o.valeurActuelle) / range) * 100)));
                    } else {
                        pct = o.valeurCible > 0
                            ? Math.min(100, Math.round((o.valeurActuelle / o.valeurCible) * 100))
                            : 0;
                    }
                    const jours = o.dateFin
                        ? Math.max(0, Math.ceil((new Date(o.dateFin) - new Date()) / 86400000))
                        : null;
                    return `<div class="dash-obj-item">
                        <div class="doi-header">
                            <span class="doi-icon">${o.icone || '🎯'}</span>
                            <span class="doi-title">${o.titre}</span>
                            ${jours !== null ? `<span class="doi-deadline">J-${jours}</span>` : ''}
                        </div>
                        <div class="doi-bar-bg">
                            <div class="doi-bar-fill" style="width:${pct}%;background:${o.couleur || 'var(--primary)'}"></div>
                        </div>
                        <div class="doi-meta">${o.valeurActuelle} / ${o.valeurCible} ${o.unite} · ${pct}%</div>
                    </div>`;
                }).join('');
            }
        }

        // Rafraîchir les graphiques
        updateRecapChart();
    }

    window.addEventListener('suivi:dataChanged', () => {
        const active = document.querySelector('.tab-button.active');
        if (!active || active.getAttribute('data-tab') === 'accueil') updateDashboard();
    });

    // ── Utilitaires globaux ──────────────────────────────────

    const PROFILE_DATA_KEYS = ['bodySettings', 'bodyHistory', 'sommeilData', 'repasData', 'seanceData', 'gfitLastAutoImport', 'mensurationsData', 'chatHistory', 'graisseCorporelleData', 'nutritionPlan', 'programmeState', 'customFoods', 'records', 'objectifs', 'scoreHebdo'];

    function getProfiles()         { return JSON.parse(localStorage.getItem('profiles') || '[]'); }
    function getCurrentProfileId() { return localStorage.getItem('currentProfileId') || null; }

    function flushToProfile(pid) {
        PROFILE_DATA_KEYS.forEach(key => {
            const v = localStorage.getItem(key);
            if (v !== null) localStorage.setItem(`profile_${pid}_${key}`, v);
            else localStorage.removeItem(`profile_${pid}_${key}`);
        });
    }

    function restoreFromProfile(pid) {
        PROFILE_DATA_KEYS.forEach(key => {
            const v = localStorage.getItem(`profile_${pid}_${key}`);
            if (v !== null) localStorage.setItem(key, v);
            else localStorage.removeItem(key);
        });
    }

    // ── Changement de profil (avec vérif PIN) ───────────────
    function switchProfile(id) {
        const cur = getCurrentProfileId();
        if (cur === id) { closeProfileDropdown(); return; }
        const profile = getProfiles().find(p => p.id === id);
        closeProfileDropdown();
        if (profile?.pin) { showPinModal(id); return; }
        doSwitchProfile(id);
    }

    let _profileSwitching = false;
    function doSwitchProfile(id) {
        if (_profileSwitching) return;
        _profileSwitching = true;
        const cur = getCurrentProfileId();
        if (cur) flushToProfile(cur);
        localStorage.setItem('currentProfileId', id);
        restoreFromProfile(id);
        renderProfileUI();
        updateDashboard();
        window.dispatchEvent(new CustomEvent('suivi:dataChanged'));
        syncFromServer(id).finally(() => { _profileSwitching = false; });
    }

    function createProfile(name, emoji, pin, sexe) {
        const profiles = getProfiles();
        const id = 'p_' + Date.now();
        const isFirst = profiles.length === 0;
        profiles.push({ id, name, emoji, pin: pin || null, sexe: sexe || 'homme', createdAt: new Date().toISOString() });
        localStorage.setItem('profiles', JSON.stringify(profiles));
        if (isFirst) {
            PROFILE_DATA_KEYS.forEach(key => {
                const v = localStorage.getItem(key);
                if (v !== null) localStorage.setItem(`profile_${id}_${key}`, v);
            });
        }
        syncProfilesToServer();
        doSwitchProfile(id);
        return id;
    }

    // ── PIN Modal ────────────────────────────────────────────
    let pinTarget = null;
    let pinEntry  = '';

    function showPinModal(profileId) {
        const profile = getProfiles().find(p => p.id === profileId);
        if (!profile) return;
        pinTarget = profileId;
        pinEntry  = '';
        document.getElementById('pinProfileEmoji').textContent = profile.emoji;
        document.getElementById('pinProfileName').textContent  = profile.name;
        document.getElementById('pinError').textContent = '';
        updatePinDots();
        document.getElementById('pinModal').style.display = 'flex';
    }

    function updatePinDots() {
        document.querySelectorAll('.pin-dot').forEach((d, i) => {
            d.classList.toggle('filled', i < pinEntry.length);
        });
    }

    function pinShake() {
        document.querySelectorAll('.pin-dot').forEach(d => {
            d.classList.add('shake');
            d.addEventListener('animationend', () => d.classList.remove('shake'), { once: true });
        });
    }

    function submitPin() {
        const profile = getProfiles().find(p => p.id === pinTarget);
        if (String(pinEntry) === String(profile.pin)) {
            document.getElementById('pinModal').style.display = 'none';
            doSwitchProfile(pinTarget);
        } else {
            document.getElementById('pinError').textContent = 'PIN incorrect — réessayez';
            pinEntry = '';
            updatePinDots();
            pinShake();
        }
    }

    // Pavé numérique
    document.getElementById('pinModal')?.addEventListener('click', e => {
        const digit = e.target.dataset.digit;
        if (digit !== undefined && pinEntry.length < 4) {
            pinEntry += digit;
            updatePinDots();
            document.getElementById('pinError').textContent = '';
            if (pinEntry.length === 4) setTimeout(submitPin, 120);
        }
        if (e.target.id === 'pinDelete') {
            pinEntry = pinEntry.slice(0, -1);
            updatePinDots();
        }
        if (e.target.id === 'pinCancel') {
            document.getElementById('pinModal').style.display = 'none';
            pinTarget = null; pinEntry = '';
        }
    });

    // Saisie clavier dans le PIN modal
    document.addEventListener('keydown', e => {
        if (document.getElementById('pinModal').style.display === 'none') return;
        if (e.key >= '0' && e.key <= '9' && pinEntry.length < 4) {
            pinEntry += e.key;
            updatePinDots();
            document.getElementById('pinError').textContent = '';
            if (pinEntry.length === 4) setTimeout(submitPin, 120);
        }
        if (e.key === 'Backspace') { pinEntry = pinEntry.slice(0, -1); updatePinDots(); }
        if (e.key === 'Escape') {
            document.getElementById('pinModal').style.display = 'none';
            pinTarget = null; pinEntry = '';
        }
    });

    // ── Fichiers data par profil ─────────────────────────────

    function exportProfileData(profileId) {
        const profiles = getProfiles();
        const profile  = profiles.find(p => p.id === profileId);
        if (!profile) return;
        // Flush si c'est le profil actif pour être sûr que tout est sauvé
        if (getCurrentProfileId() === profileId) flushToProfile(profileId);

        const data = {};
        PROFILE_DATA_KEYS.forEach(key => {
            const v = localStorage.getItem(`profile_${profileId}_${key}`);
            if (v !== null) { try { data[key] = JSON.parse(v); } catch(_) {} }
        });

        const payload = { profile: { id: profile.id, name: profile.name, emoji: profile.emoji }, data, exportedAt: new Date().toISOString() };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `profile_${profile.id}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    async function seedFromDataFile(profile) {
        try {
            const r = await fetch(`./data/profile_${profile.id}.json`, { cache: 'no-cache' });
            if (!r.ok) return;
            const { data } = await r.json();
            if (!data) return;
            PROFILE_DATA_KEYS.forEach(key => {
                if (data[key] !== undefined)
                    localStorage.setItem(`profile_${profile.id}_${key}`, JSON.stringify(data[key]));
            });
            console.log(`[Profil] Données chargées depuis data/profile_${profile.id}.json`);
            // Si c'est le profil actif, restaurer les clés courantes
            if (getCurrentProfileId() === profile.id) {
                restoreFromProfile(profile.id);
                window.dispatchEvent(new CustomEvent('suivi:dataChanged'));
            }
        } catch(_) { /* fichier absent ou réseau indisponible — silencieux */ }
    }

    function closeProfileDropdown() {
        document.getElementById('profileDropdown')?.classList.remove('open');
        document.getElementById('profileBtn')?.setAttribute('aria-expanded', 'false');
    }

    function renderProfileUI() {
        const profiles  = getProfiles();
        const currentId = getCurrentProfileId();
        const current   = profiles.find(p => p.id === currentId);
        const btnEmoji  = document.getElementById('profileBtnEmoji');
        const btnName   = document.getElementById('profileBtnName');
        if (btnEmoji) btnEmoji.textContent = current?.emoji || '👤';
        if (btnName)  btnName.textContent  = current?.name  || 'Profil';
        const list = document.getElementById('profileList');
        if (!list) return;
        list.innerHTML = '';
        profiles.forEach(p => {
            const row = document.createElement('div');
            row.style.cssText = 'display:flex;align-items:center';

            const btn = document.createElement('button');
            btn.className = 'profile-item' + (p.id === currentId ? ' active' : '');
            btn.style.flex = '1';
            const sEmoji = document.createElement('span');
            sEmoji.textContent = p.emoji;
            const sName = document.createElement('span');
            sName.style.flex = '1';
            sName.textContent = p.name;
            btn.appendChild(sEmoji);
            btn.appendChild(sName);
            if (p.pin) {
                const sPin = document.createElement('span');
                sPin.style.cssText = 'font-size:11px;opacity:0.5';
                sPin.textContent = '🔒';
                btn.appendChild(sPin);
            }
            if (p.id === currentId) {
                const sCheck = document.createElement('span');
                sCheck.style.cssText = 'font-size:11px;opacity:0.6;margin-left:4px';
                sCheck.textContent = '✓';
                btn.appendChild(sCheck);
            }
            btn.addEventListener('click', () => switchProfile(p.id));

            const btnStyle = 'padding:10px 10px;background:none;border:none;cursor:pointer;font-size:13px;transition:color 0.15s;color:var(--text-3)';

            const exp = document.createElement('button');
            exp.title = 'Exporter les données';
            exp.style.cssText = btnStyle;
            exp.textContent = '📤';
            exp.addEventListener('mouseenter', () => exp.style.color = 'var(--primary)');
            exp.addEventListener('mouseleave', () => exp.style.color = 'var(--text-3)');
            exp.addEventListener('click', (e) => { e.stopPropagation(); exportProfileData(p.id); });

            const push = document.createElement('button');
            push.title = 'Envoyer vers le serveur';
            push.style.cssText = btnStyle;
            push.textContent = '☁️';
            push.addEventListener('mouseenter', () => push.style.color = 'var(--primary)');
            push.addEventListener('mouseleave', () => push.style.color = 'var(--text-3)');
            push.addEventListener('click', (e) => { e.stopPropagation(); closeProfileDropdown(); pushProfileToServer(p.id); });

            const cfg = document.createElement('button');
            cfg.title = 'Modifier le profil';
            cfg.style.cssText = btnStyle;
            cfg.textContent = '⚙';
            cfg.addEventListener('mouseenter', () => cfg.style.color = 'var(--primary)');
            cfg.addEventListener('mouseleave', () => cfg.style.color = 'var(--text-3)');
            cfg.addEventListener('click', (e) => { e.stopPropagation(); closeProfileDropdown(); editProfile(p.id); });

            row.appendChild(btn);
            row.appendChild(exp);
            row.appendChild(push);
            row.appendChild(cfg);
            list.appendChild(row);
        });
    }

    async function pushProfileToServer(profileId) {
        const token = localStorage.getItem('serverToken');
        if (!token) {
            openInfoModal('Serveur non configuré', '<p>Configure d\'abord le token serveur via le bouton <strong>Serveur</strong> en haut à droite.</p>');
            return;
        }
        if (getCurrentProfileId() === profileId) flushToProfile(profileId);
        let ok = 0, fail = 0;
        for (const key of PROFILE_DATA_KEYS) {
            const raw = localStorage.getItem(`profile_${profileId}_${key}`);
            if (raw === null) continue;
            // S'assurer que le body est du JSON valide
            let body;
            try { JSON.parse(raw); body = raw; }
            catch (_) { body = JSON.stringify(raw); }
            try {
                const res = await fetch(`/api/${profileId}/${key}`, {
                    method:  'POST',
                    headers: { 'Content-Type': 'application/json', 'x-token': token },
                    body
                });
                res.ok ? ok++ : fail++;
            } catch (_) { fail++; }
        }
        updateServerStatus(fail === 0);
        openInfoModal('Envoi vers le serveur', fail === 0
            ? `<p>✓ ${ok} clé(s) envoyée(s) avec succès.</p>`
            : `<p>⚠️ ${ok} réussie(s), ${fail} échouée(s). Vérifie le token et la connexion.</p>`
        );
    }

    function managePin(profileId) {
        const profile = getProfiles().find(p => p.id === profileId);
        if (!profile) return;
        const hasPin = !!profile.pin;
        openModal({
            title: `${profile.emoji} ${profile.name} — PIN`,
            fields: [
                { key: 'pin', label: hasPin ? 'Nouveau PIN (vide = supprimer)' : 'PIN (4 chiffres)', type: 'number', min: 0, placeholder: '1234' }
            ],
            values: { pin: '' },
            onSave: (vals) => {
                const raw = String(vals.pin || '').trim();
                const profiles = getProfiles();
                const idx = profiles.findIndex(p => p.id === profileId);
                if (idx < 0) return;
                if (!raw) {
                    profiles[idx].pin = null;
                } else if (/^\d{4}$/.test(raw)) {
                    profiles[idx].pin = raw;
                } else {
                    alert('Le PIN doit contenir exactement 4 chiffres.');
                    return;
                }
                localStorage.setItem('profiles', JSON.stringify(profiles));
                renderProfileUI();
            }
        });
    }

    function promptCreateProfile(isFirst = false) {
        openModal({
            title: isFirst ? '👋 Bienvenue — crée ton profil' : 'Nouveau profil',
            fields: [
                { key: 'name',  label: 'Prénom', type: 'text', placeholder: 'Ex: Thomas' },
                { key: 'emoji', label: 'Avatar', type: 'select', options: [
                    ['🏃','🏃 Coureur'], ['🧘','🧘 Yoga'], ['💪','💪 Muscu'],
                    ['🚴','🚴 Cycliste'], ['🏊','🏊 Nageur'], ['⚽','⚽ Football'],
                    ['🎯','🎯 Objectif'], ['🌟','🌟 Star'], ['👤','👤 Défaut']
                ]},
                { key: 'sexe', label: 'Sexe', type: 'select', options: [['homme', 'Homme'], ['femme', 'Femme']] },
                { key: 'pin', label: 'PIN (optionnel — 4 chiffres)', type: 'number', min: 0, placeholder: 'Laisser vide = sans PIN' },
            ],
            values: { name: '', emoji: '🏃', sexe: 'homme', pin: '' },
            onSave: (vals) => {
                if (!vals.name.trim()) return;
                const raw = String(vals.pin || '').trim();
                const pin = raw && /^\d{4}$/.test(raw) ? raw : null;
                createProfile(vals.name.trim(), vals.emoji || '👤', pin, vals.sexe || 'homme');
            }
        });
    }

    function editProfile(profileId) {
        const profiles = getProfiles();
        const idx = profiles.findIndex(p => p.id === profileId);
        if (idx < 0) return;
        const profile = profiles[idx];
        openModal({
            title: `${profile.emoji} Modifier le profil`,
            fields: [
                { key: 'name',  label: 'Prénom', type: 'text', placeholder: 'Ex: Thomas' },
                { key: 'emoji', label: 'Avatar', type: 'select', options: [
                    ['🏃','🏃 Coureur'], ['🧘','🧘 Yoga'], ['💪','💪 Muscu'],
                    ['🚴','🚴 Cycliste'], ['🏊','🏊 Nageur'], ['⚽','⚽ Football'],
                    ['🎯','🎯 Objectif'], ['🌟','🌟 Star'], ['👤','👤 Défaut']
                ]},
                { key: 'sexe', label: 'Sexe', type: 'select', options: [['homme', 'Homme'], ['femme', 'Femme']] },
                { key: 'pin', label: 'PIN (4 chiffres — vide = inchangé, "0" = supprimer)', type: 'number', min: 0, placeholder: '1234' },
            ],
            values: { name: profile.name, emoji: profile.emoji, sexe: profile.sexe || 'homme', pin: '' },
            onSave: (vals) => {
                const fresh = getProfiles();
                const i = fresh.findIndex(p => p.id === profileId);
                if (i < 0) return;
                fresh[i].name  = vals.name.trim() || fresh[i].name;
                fresh[i].emoji = vals.emoji || fresh[i].emoji;
                fresh[i].sexe  = vals.sexe || 'homme';
                const raw = String(vals.pin || '').trim();
                if (raw === '0') fresh[i].pin = null;
                else if (/^\d{4}$/.test(raw)) fresh[i].pin = raw;
                localStorage.setItem('profiles', JSON.stringify(fresh));
                syncProfilesToServer();
                renderProfileUI();
                window.dispatchEvent(new CustomEvent('suivi:dataChanged'));
            }
        });
    }

    document.getElementById('profileBtn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        const dd = document.getElementById('profileDropdown');
        const isOpen = dd.classList.toggle('open');
        document.getElementById('profileBtn').setAttribute('aria-expanded', String(isOpen));
    });
    document.addEventListener('click', (e) => {
        if (!document.getElementById('profileSwitcher')?.contains(e.target)) closeProfileDropdown();
    });
    document.getElementById('profileAddBtn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        closeProfileDropdown();
        promptCreateProfile(false);
    });

    renderProfileUI();
    const _initProfiles = getProfiles();
    if (_initProfiles.length === 0) {
        setTimeout(() => promptCreateProfile(true), 400);
    } else {
        if (!getCurrentProfileId()) {
            document.getElementById('profileDropdown')?.classList.add('open');
        }
        // Seed depuis data/ pour les profils qui n'ont pas encore de données locales
        _initProfiles.forEach(p => {
            const hasLocal = PROFILE_DATA_KEYS.some(k => localStorage.getItem(`profile_${p.id}_${k}`) !== null);
            if (!hasLocal) seedFromDataFile(p);
        });
    }

    // ── Sync serveur ─────────────────────────────────────────────────────────

    function updateServerStatus(connected) {
        const dot = document.getElementById('serverStatusDot');
        const btn = document.getElementById('serverStatusBtn');
        if (!dot || !btn) return;
        dot.title            = connected ? 'Serveur connecté' : 'Serveur non disponible';
        dot.style.background = connected ? 'var(--success)' : 'var(--error)';
        // Cacher si connecté, afficher si erreur ou pas de token
        const hasToken = !!localStorage.getItem('serverToken');
        btn.style.display = (!hasToken || !connected) ? '' : 'none';
    }

    async function syncToServer(key, data) {
        const token = localStorage.getItem('serverToken');
        const pid   = getCurrentProfileId();
        if (!token || !pid) return;
        try {
            const res = await fetch(`/api/${pid}/${key}`, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json', 'x-token': token },
                body:    JSON.stringify(data)
            });
            updateServerStatus(res.ok);
        } catch (_) { updateServerStatus(false); }
    }

    async function syncProfilesToServer() {
        const token = localStorage.getItem('serverToken');
        if (!token) return;
        try {
            // Récupère les profils du serveur, fusionne avec les locaux (par id)
            const res = await fetch('/api/_global/profiles', { headers: { 'x-token': token } });
            let serverProfiles = [];
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) serverProfiles = data;
            }
            const local = getProfiles();
            const merged = [...serverProfiles];
            local.forEach(lp => {
                const idx = merged.findIndex(sp => sp.id === lp.id);
                if (idx >= 0) merged[idx] = lp;
                else merged.push(lp);
            });
            await fetch('/api/_global/profiles', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json', 'x-token': token },
                body:    JSON.stringify(merged)
            });
        } catch (_) {}
    }

    async function syncProfilesFromServer() {
        const token = localStorage.getItem('serverToken');
        if (!token) return;
        try {
            const res = await fetch('/api/_global/profiles', { headers: { 'x-token': token } });
            if (!res.ok) return;
            const serverProfiles = await res.json();
            if (Array.isArray(serverProfiles) && serverProfiles.length > 0) {
                localStorage.setItem('profiles', JSON.stringify(serverProfiles));
                renderProfileUI();
            } else {
                // Serveur vide → on pousse les profils locaux
                await syncProfilesToServer();
            }
        } catch (_) {}
    }

    async function autoConfigureToken() {
        try {
            // Si un token est déjà stocké, on vérifie juste qu'il fonctionne
            const existing = localStorage.getItem('serverToken');
            if (existing) {
                const check = await fetch('/api/_global/profiles', { headers: { 'x-token': existing } });
                if (check.ok) {
                    updateServerStatus(true);
                    await syncProfilesFromServer();
                    syncFromServer(getCurrentProfileId());
                    return;
                }
            }
            // Sinon on récupère le token depuis le serveur
            const res = await fetch('/api/config');
            if (!res.ok) { updateServerStatus(false); return; }
            const { token } = await res.json();
            if (token) {
                localStorage.setItem('serverToken', token);
                updateServerStatus(true);
                await syncProfilesFromServer();
                syncFromServer(getCurrentProfileId());
            }
        } catch (_) { updateServerStatus(false); }
    }

    async function syncFromServer(pid) {
        const token = localStorage.getItem('serverToken');
        if (!token || !pid) return;
        try {
            const res = await fetch(`/api/${pid}`, { headers: { 'x-token': token } });
            if (!res.ok) { updateServerStatus(false); return; }
            const serverData = await res.json();
            let changed = false;
            Object.entries(serverData).forEach(([key, value]) => {
                const serverRaw = JSON.stringify(value);
                if (localStorage.getItem(key) !== serverRaw) {
                    localStorage.setItem(key, serverRaw);
                    changed = true;
                }
                localStorage.setItem(`profile_${pid}_${key}`, serverRaw);
            });
            if (changed) window.dispatchEvent(new CustomEvent('suivi:dataChanged'));
            updateServerStatus(true);
        } catch (_) { updateServerStatus(false); }
    }

    window.openServerConfig = function () {
        const current = localStorage.getItem('serverToken') || '';
        openModal({
            title: 'Connexion au serveur',
            fields: [
                { key: 'token', label: 'Token d\'accès', type: 'password', placeholder: 'changeme' }
            ],
            values: { token: current },
            onSave: (vals) => {
                const t = vals.token.trim();
                if (t) localStorage.setItem('serverToken', t);
                else   localStorage.removeItem('serverToken');
                syncFromServer(getCurrentProfileId());
            }
        });
    };

    // ── Fonctions de données ──────────────────────────────────────────────────

    window.saveData = function (key, data) {
        const json = JSON.stringify(data);
        localStorage.setItem(key, json);
        const pid = getCurrentProfileId();
        if (pid) localStorage.setItem(`profile_${pid}_${key}`, json);
        syncToServer(key, data);
    };

    window.loadData = function (key, defaultValue = []) {
        try { return JSON.parse(localStorage.getItem(key)) ?? defaultValue; } catch { return defaultValue; }
    };

    window.saveBodySettings = function (settings) {
        const json = JSON.stringify(settings);
        localStorage.setItem('bodySettings', json);
        const pid = getCurrentProfileId();
        if (pid) localStorage.setItem(`profile_${pid}_bodySettings`, json);
        syncToServer('bodySettings', settings);
    };

    window.loadBodySettings = function () {
        try { return JSON.parse(localStorage.getItem('bodySettings') || 'null'); } catch { return null; }
    };

    window.showFeedback = function (container, message, type = 'success') {
        const el = document.createElement('div');
        el.className = `feedback feedback-${type}`;
        el.textContent = message;
        container.appendChild(el);
        setTimeout(() => el.remove(), 3000);
    };

    // Sync serveur au démarrage — récupère le token automatiquement puis les profils
    updateServerStatus(false);
    autoConfigureToken();

    // Initialiser le dashboard au démarrage
    updateDashboard();

    // ── Modale d'édition globale ─────────────────────────────
    // Utilisation : openModal({ title, fields, values, onSave })
    // fields : [{ key, label, type, options }]
    // values : { key: value, ... }
    // onSave : function(newValues) appelée avec les valeurs modifiées

    const modal       = document.getElementById('editModal');
    const modalTitle  = document.getElementById('modalTitle');
    const modalForm   = document.getElementById('modalForm');
    const modalSave   = document.getElementById('modalSave');
    const modalCancel = document.getElementById('modalCancel');

    window.openModal = function ({ title, fields, values, onSave }) {
        modalTitle.textContent = title;
        modalForm.innerHTML = '';

        fields.forEach(f => {
            const label = document.createElement('label');
            label.textContent = f.label;
            label.setAttribute('for', `modal_${f.key}`);

            let input;
            if (f.type === 'select') {
                input = document.createElement('select');
                (f.options || []).forEach(([val, txt]) => {
                    const opt = document.createElement('option');
                    opt.value = val;
                    opt.textContent = txt;
                    if (String(values[f.key]) === String(val)) opt.selected = true;
                    input.appendChild(opt);
                });
            } else if (f.type === 'textarea') {
                input = document.createElement('textarea');
                input.rows = 3;
                input.value = values[f.key] ?? '';
            } else {
                input = document.createElement('input');
                input.type = f.type || 'text';
                input.value = values[f.key] ?? '';
                if (f.step)        input.step        = f.step;
                if (f.min !== undefined) input.min   = f.min;
                if (f.max !== undefined) input.max   = f.max;
                if (f.placeholder) input.placeholder = f.placeholder;
            }
            input.id = `modal_${f.key}`;

            modalForm.appendChild(label);
            modalForm.appendChild(input);
        });

        modal.style.display = 'flex';

        modalSave.onclick = () => {
            const result = {};
            fields.forEach(f => {
                const el = document.getElementById(`modal_${f.key}`);
                result[f.key] = (f.type === 'number') ? (parseFloat(el.value) || 0) : el.value;
            });
            onSave(result);
            modal.style.display = 'none';
        };

        modalCancel.onclick = () => { modal.style.display = 'none'; };
        modal.addEventListener('click', e => { if (e.target === modal) modal.style.display = 'none'; }, { once: true });
    };

    // Modale info-only (pas de formulaire, juste du contenu HTML)
    window.openInfoModal = function (title, html) {
        modalTitle.textContent = title;
        modalForm.innerHTML = html;
        modalSave.style.display = 'none';
        modalCancel.textContent = 'Fermer';
        modal.style.display = 'flex';
        modalCancel.onclick = () => {
            modal.style.display = 'none';
            modalSave.style.display = '';
            modalCancel.textContent = 'Annuler';
        };
        modal.addEventListener('click', e => {
            if (e.target === modal) {
                modal.style.display = 'none';
                modalSave.style.display = '';
                modalCancel.textContent = 'Annuler';
            }
        }, { once: true });
    };
});
