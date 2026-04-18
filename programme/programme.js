document.addEventListener('DOMContentLoaded', function () {

    // ── Données des plans ─────────────────────────────────────────────────────

    const PDC = {
        label: 'Poids du corps',
        days: [
            {
                label: 'Jour 1 — Poussée + Jambes',
                exercices: [
                    { nom: 'Tractions pronation',       tempo: 'Explosif',  repos: '2min',    semaines: [[0,0,0,0],[2,2,1,1],[3,3,3,2],[4,4,3,3]] },
                    { nom: 'Tractions australiennes',   tempo: 'Contrôlé',  repos: '1min30',  semaines: [[5,5,5,5],[7,7,6,6],[8,8,8,7],[9,9,8,8]] },
                    { nom: 'Dips',                      tempo: 'Explosif',  repos: '2min',    semaines: [[3,3,3,3],[5,5,4,4],[6,6,6,5],[7,7,6,6]] },
                    { nom: 'Dips au sol',               tempo: 'Contrôlé',  repos: '1min30',  semaines: [[10,10,10,10],[12,12,11,11],[13,13,13,12],[14,14,13,13]] },
                    { nom: 'Pompes',                    tempo: 'Contrôlé',  repos: '1min',    semaines: [[9,9,9,9],[11,11,10,10],[12,12,12,11],[13,13,12,12]] },
                    { nom: 'Pompes sur les genoux',     tempo: 'Contrôlé',  repos: '1min30',  semaines: [[20,20,20,20],[22,22,21,21],[23,23,23,22],[24,24,23,23]] },
                    { nom: 'Squat pistol assisté',      tempo: 'Explosif',  repos: '2min',    semaines: [[5,5,5,5],[7,7,6,6],[8,8,8,7],[9,9,8,8]] },
                    { nom: 'Squats',                    tempo: 'Contrôlé',  repos: '1min30',  semaines: [[10,10,10,10],[12,12,11,11],[13,13,13,12],[14,14,13,13]] },
                ]
            },
            {
                label: 'Jour 2 — Traction + Gainage',
                exercices: [
                    { nom: 'Tractions supination',      tempo: 'Explosif',  repos: '2min',    semaines: [[0,0,0,0],[2,2,1,1],[3,3,3,2],[4,4,3,3]] },
                    { nom: 'Tractions australiennes',   tempo: 'Contrôlé',  repos: '1min30',  semaines: [[5,5,5,5],[7,7,6,6],[8,8,8,7],[9,9,8,8]] },
                    { nom: 'Pompes diamant',             tempo: 'Explosif',  repos: '2min',    semaines: [[3,3,3,3],[5,5,4,4],[6,6,6,5],[7,7,6,6]] },
                    { nom: 'Pompes larges',              tempo: 'Contrôlé',  repos: '1min',    semaines: [[9,9,9,9],[11,11,10,10],[12,12,12,11],[13,13,12,12]] },
                    { nom: 'Gainage frontal (s)',        tempo: 'Contrôlé',  repos: '1min',    semaines: [[30,30,30,30],[35,35,30,30],[40,40,40,35],[45,45,40,40]] },
                    { nom: 'Gainage latéral (s)',        tempo: 'Contrôlé',  repos: '1min',    semaines: [[20,20,20,20],[25,25,20,20],[30,30,30,25],[35,35,30,30]] },
                    { nom: 'Fentes',                    tempo: 'Contrôlé',  repos: '1min30',  semaines: [[10,10,10,10],[12,12,11,11],[13,13,13,12],[14,14,13,13]] },
                    { nom: 'Hip thrust',                 tempo: 'Contrôlé',  repos: '1min',    semaines: [[12,12,12,12],[14,14,13,13],[15,15,15,14],[16,16,15,15]] },
                ]
            },
            {
                label: 'Jour 3 — Full body',
                exercices: [
                    { nom: 'Tractions pronation',       tempo: 'Explosif',  repos: '2min',    semaines: [[0,0,0,0],[2,2,1,1],[3,3,3,2],[4,4,3,3]] },
                    { nom: 'Dips',                      tempo: 'Explosif',  repos: '2min',    semaines: [[3,3,3,3],[5,5,4,4],[6,6,6,5],[7,7,6,6]] },
                    { nom: 'Pompes',                    tempo: 'Contrôlé',  repos: '1min',    semaines: [[9,9,9,9],[11,11,10,10],[12,12,12,11],[13,13,12,12]] },
                    { nom: 'Squats',                    tempo: 'Contrôlé',  repos: '1min30',  semaines: [[10,10,10,10],[12,12,11,11],[13,13,13,12],[14,14,13,13]] },
                    { nom: 'Fentes',                    tempo: 'Contrôlé',  repos: '1min30',  semaines: [[10,10,10,10],[12,12,11,11],[13,13,13,12],[14,14,13,13]] },
                    { nom: 'Gainage frontal (s)',        tempo: 'Contrôlé',  repos: '1min',    semaines: [[30,30,30,30],[35,35,30,30],[40,40,40,35],[45,45,40,40]] },
                ]
            },
            {
                label: 'Jour 4 — Épaules + Bras',
                exercices: [
                    { nom: 'Pompes pike',                tempo: 'Explosif',  repos: '2min',    semaines: [[5,5,5,5],[7,7,6,6],[8,8,8,7],[9,9,8,8]] },
                    { nom: 'Pompes sur les genoux',      tempo: 'Contrôlé',  repos: '1min30',  semaines: [[20,20,20,20],[22,22,21,21],[23,23,23,22],[24,24,23,23]] },
                    { nom: 'Tractions australiennes',    tempo: 'Contrôlé',  repos: '1min30',  semaines: [[5,5,5,5],[7,7,6,6],[8,8,8,7],[9,9,8,8]] },
                    { nom: 'Dips au sol',                tempo: 'Contrôlé',  repos: '1min30',  semaines: [[10,10,10,10],[12,12,11,11],[13,13,13,12],[14,14,13,13]] },
                    { nom: 'Curl inversé (bande)',       tempo: 'Contrôlé',  repos: '1min',    semaines: [[12,12,12,12],[14,14,13,13],[15,15,15,14],[16,16,15,15]] },
                    { nom: 'Extension triceps (bande)',  tempo: 'Contrôlé',  repos: '1min',    semaines: [[12,12,12,12],[14,14,13,13],[15,15,15,14],[16,16,15,15]] },
                ]
            },
        ]
    };

    const SALLE = {
        label: 'Salle',
        rmKey: '10rm',
        rmLabel: '10RM',
        days: [
            {
                label: 'Jour 1 — Push + Legs',
                exercices: [
                    { id: 'dev-couche',    nom: 'Développé décliné/couché',  tempo: 'Explosif',  repos: '2min',    rmBase: 90,  semaines: [[8,8,8,8],[11,11,11,11],[8,8,8,8],[10,10,10,10]],  phase: [1,1,1.11,1.11] },
                    { id: 'rowing-pro',    nom: 'Rowing Pronation',           tempo: 'Contrôlé',  repos: '1min30',  rmBase: 54,  semaines: [[8,8,8,8],[11,11,11,11],[8,8,8,8],[10,10,10,10]],  phase: [1,1,1.11,1.11] },
                    { id: 'dev-mil',       nom: 'Développé Militaire',        tempo: 'Explosif',  repos: '2min',    rmBase: 41,  semaines: [[8,8,8,8],[11,11,11,11],[8,8,8,8],[10,10,10,10]],  phase: [1,1,1.10,1.10] },
                    { id: 'curl-incline',  nom: 'Curl Incliné Haltère',       tempo: 'Contrôlé',  repos: '1min30',  rmBase: 15,  semaines: [[12,12,12,null],[15,15,15,null],[14,14,14,null],[12,12,12,null]],  phase: [1,1,1.07,1.33] },
                    { id: 'ext-tri',       nom: 'Extension Triceps Poulie',   tempo: 'Contrôlé',  repos: '1min',    rmBase: 34,  semaines: [[12,12,12,null],[15,15,15,null],[14,14,14,null],[12,12,12,null]],  phase: [1,1,1.06,1.32] },
                    { id: 'press-cuisse',  nom: 'Press à Cuisse',             tempo: 'Contrôlé',  repos: '1min30',  rmBase: 90,  semaines: [[8,8,8,8],[11,11,11,11],[8,8,8,8],[10,10,10,10]],  phase: [1,1,1.11,1.11] },
                    { id: 'leg-curl',      nom: 'Leg Curl',                   tempo: 'Explosif',  repos: '2min',    rmBase: 32,  semaines: [[12,12,12,null],[15,15,15,null],[14,14,14,null],[12,12,12,null]],  phase: [1,1,1.13,1.41] },
                ]
            },
            {
                label: 'Jour 2 — Pull + Core',
                exercices: [
                    { id: 'tractions',     nom: 'Tractions lestées',          tempo: 'Explosif',  repos: '2min',    rmBase: 20,  semaines: [[8,8,8,8],[11,11,11,11],[8,8,8,8],[10,10,10,10]],  phase: [1,1,1.11,1.11] },
                    { id: 'tirage-poulie', nom: 'Tirage poulie haute',        tempo: 'Contrôlé',  repos: '1min30',  rmBase: 54,  semaines: [[8,8,8,8],[11,11,11,11],[8,8,8,8],[10,10,10,10]],  phase: [1,1,1.11,1.11] },
                    { id: 'curl-barre',    nom: 'Curl Barre',                 tempo: 'Contrôlé',  repos: '1min30',  rmBase: 30,  semaines: [[12,12,12,null],[15,15,15,null],[14,14,14,null],[12,12,12,null]],  phase: [1,1,1.07,1.33] },
                    { id: 'crunch',        nom: 'Crunch / Abdos',             tempo: 'Contrôlé',  repos: '1min',    rmBase: 0,   semaines: [[15,15,15,null],[18,18,18,null],[20,20,20,null],[20,20,20,null]],  phase: [1,1,1,1] },
                ]
            },
            {
                label: 'Jour 3 — Push (bis)',
                exercices: [
                    { id: 'dev-couche',    nom: 'Développé couché',           tempo: 'Explosif',  repos: '2min',    rmBase: 90,  semaines: [[8,8,8,8],[11,11,11,11],[8,8,8,8],[10,10,10,10]],  phase: [1,1,1.11,1.11] },
                    { id: 'dev-hal',       nom: 'Développé Haltères incliné', tempo: 'Contrôlé',  repos: '1min30',  rmBase: 24,  semaines: [[12,12,12,null],[15,15,15,null],[14,14,14,null],[12,12,12,null]],  phase: [1,1,1.08,1.33] },
                    { id: 'dev-mil',       nom: 'Développé Militaire',        tempo: 'Explosif',  repos: '2min',    rmBase: 41,  semaines: [[8,8,8,8],[11,11,11,11],[8,8,8,8],[10,10,10,10]],  phase: [1,1,1.10,1.10] },
                    { id: 'squat',         nom: 'Squat',                      tempo: 'Explosif',  repos: '2min',    rmBase: 100, semaines: [[8,8,8,8],[11,11,11,11],[8,8,8,8],[10,10,10,10]],  phase: [1,1,1.10,1.10] },
                    { id: 'press-cuisse',  nom: 'Press à Cuisse',             tempo: 'Contrôlé',  repos: '1min30',  rmBase: 90,  semaines: [[8,8,8,8],[11,11,11,11],[8,8,8,8],[10,10,10,10]],  phase: [1,1,1.11,1.11] },
                ]
            },
            {
                label: 'Jour 4 — Pull (bis)',
                exercices: [
                    { id: 'rowing-pro',    nom: 'Rowing Pronation',           tempo: 'Contrôlé',  repos: '1min30',  rmBase: 54,  semaines: [[8,8,8,8],[11,11,11,11],[8,8,8,8],[10,10,10,10]],  phase: [1,1,1.11,1.11] },
                    { id: 'dev-couche',    nom: 'Rowing Haltère 1 bras',      tempo: 'Explosif',  repos: '1min30',  rmBase: 24,  semaines: [[12,12,12,null],[15,15,15,null],[14,14,14,null],[12,12,12,null]],  phase: [1,1,1.08,1.33] },
                    { id: 'leg-curl',      nom: 'Leg Curl',                   tempo: 'Explosif',  repos: '2min',    rmBase: 32,  semaines: [[12,12,12,null],[15,15,15,null],[14,14,14,null],[12,12,12,null]],  phase: [1,1,1.13,1.41] },
                    { id: 'curl-barre',    nom: 'Curl Barre',                 tempo: 'Contrôlé',  repos: '1min30',  rmBase: 30,  semaines: [[12,12,12,null],[15,15,15,null],[14,14,14,null],[12,12,12,null]],  phase: [1,1,1.07,1.33] },
                ]
            },
        ]
    };

    const AVANCE = {
        label: 'Avancé 5×5',
        rmKey: '1rm',
        rmLabel: '1RM',
        days: [
            {
                label: 'Séance A',
                exercices: [
                    { id: 'squat',     nom: 'Squat',              tempo: 'Explosif',  repos: '3min',  rmBase: 140, semaines: [[5,5,5,5,5],[5,5,5,5,5],[5,5,5,5,5],[5,5,5,5,5]], pcts: [0.65, 0.7125, 0.775, 0.8375], backoff: { sets: 2, reps: 12, pct: 0.525 } },
                    { id: 'dev-couche',nom: 'Développé couché',   tempo: 'Explosif',  repos: '3min',  rmBase: 120, semaines: [[5,5,5,5,5],[5,5,5,5,5],[5,5,5,5,5],[5,5,5,5,5]], pcts: [0.75, 0.8125, 0.875, 0.9375], backoff: { sets: 2, reps: 12, pct: 0.60 } },
                    { id: 'rowing-pro',nom: 'Rowing Pronation',   tempo: 'Explosif',  repos: '3min',  rmBase: 80,  semaines: [[5,5,5,5,5],[5,5,5,5,5],[5,5,5,5,5],[5,5,5,5,5]], pcts: [0.75, 0.875, 0.75, 0.875],   backoff: { sets: 2, reps: 12, pct: 0.60 } },
                ]
            },
            {
                label: 'Séance B',
                exercices: [
                    { id: 'squat',     nom: 'Squat',              tempo: 'Explosif',  repos: '3min',  rmBase: 140, semaines: [[5,5,5,5,5],[5,5,5,5,5],[5,5,5,5,5],[5,5,5,5,5]], pcts: [0.65, 0.7125, 0.775, 0.8375], backoff: { sets: 2, reps: 12, pct: 0.525 } },
                    { id: 'dev-mil',   nom: 'Développé Militaire',tempo: 'Explosif',  repos: '3min',  rmBase: 70,  semaines: [[5,5,5,5,5],[5,5,5,5,5],[5,5,5,5,5],[5,5,5,5,5]], pcts: [0.65, 0.625, 0.75, 0.7167],  backoff: null },
                    { id: 'deadlift',  nom: 'Deadlift (1×5)',      tempo: 'Explosif',  repos: '3min',  rmBase: 160, semaines: [[5],[5],[5],[5]],                                  pcts: [0.75, null, 0.875, null],     backoff: null },
                ]
            },
        ]
    };

    const PLANS = { pdc: PDC, salle: SALLE, avance: AVANCE };

    // ── État ──────────────────────────────────────────────────────────────────

    function loadState() {
        try { return JSON.parse(localStorage.getItem('programmeState') || 'null') || { type: 'pdc', week: 1, day: 0, rms: {}, checked: {} }; }
        catch { return { type: 'pdc', week: 1, day: 0, rms: {}, checked: {} }; }
    }

    function saveState(s) {
        localStorage.setItem('programmeState', JSON.stringify(s));
        const pid = localStorage.getItem('currentProfileId');
        if (pid) localStorage.setItem(`profile_${pid}_programmeState`, JSON.stringify(s));
    }

    let state = loadState();

    // ── Timer de repos ────────────────────────────────────────────────────────

    let timerInterval = null;
    let timerRemaining = 0;

    function parseRepos(str) {
        const m = str.match(/(\d+)min(?:(\d+))?/);
        if (!m) return 120;
        return parseInt(m[1]) * 60 + (m[2] ? parseInt(m[2]) : 0);
    }

    function startTimer(seconds) {
        clearInterval(timerInterval);
        timerRemaining = seconds;
        renderTimer();
        timerInterval = setInterval(() => {
            timerRemaining--;
            renderTimer();
            if (timerRemaining <= 0) {
                clearInterval(timerInterval);
                const timerEl = document.getElementById('restTimer');
                if (timerEl) timerEl.classList.add('timer-done');
            }
        }, 1000);
    }

    function renderTimer() {
        const timerEl = document.getElementById('restTimer');
        if (!timerEl) return;
        timerEl.classList.remove('timer-done');
        const m = Math.floor(timerRemaining / 60);
        const s = timerRemaining % 60;
        timerEl.textContent = `⏱ Repos : ${m}:${String(s).padStart(2, '0')}`;
        timerEl.style.display = timerRemaining > 0 ? '' : 'none';
    }

    // ── Calcul des poids pour Salle / Avancé ──────────────────────────────────

    function getWeight(ex, weekIdx, plan) {
        const rm = state.rms[ex.id];
        if (plan.rmKey === '10rm') {
            if (!rm && rm !== 0) return ex.rmBase;
            const phase = ex.phase?.[weekIdx] || 1;
            const raw = rm * phase;
            return Math.round(raw * 2) / 2; // arrondi au 0.5 kg
        }
        if (plan.rmKey === '1rm') {
            if (!rm && rm !== 0) return ex.rmBase;
            const pct = ex.pcts?.[weekIdx];
            if (!pct) return null;
            return Math.round(rm * pct * 2) / 2;
        }
        return null;
    }

    // ── Rendu du programme du jour ────────────────────────────────────────────

    function renderProgramme() {
        const plan = PLANS[state.type];
        const day = plan.days[state.day];
        const weekIdx = state.week - 1;
        const el = document.getElementById('programmeContent');
        if (!el || !day) return;

        // En-tête semaine / jour
        document.getElementById('progWeekLabel').textContent = `Semaine ${state.week} / 4`;
        document.getElementById('progDayLabel').textContent = day.label;

        // Barre de progression semaine
        const progBar = document.getElementById('progWeekBar');
        if (progBar) progBar.style.width = `${(state.week / 4) * 100}%`;

        el.innerHTML = '';
        day.exercices.forEach((ex, eIdx) => {
            const reps = plan.rmKey === 'avance' ? ex.semaines[weekIdx] : (ex.semaines?.[weekIdx] || []);
            const weight = plan.rmKey !== undefined ? getWeight(ex, weekIdx, plan) : null;
            const weightStr = weight !== null && weight !== undefined && weight > 0 ? `@ ${weight} kg` : '';
            const backoff = ex.backoff;

            const sets = reps.filter(r => r !== null);
            const setsHtml = sets.map((r, sIdx) => {
                const key = `${state.week}-${state.day}-${eIdx}-${sIdx}`;
                const checked = !!state.checked[key];
                return `<label class="prog-set-check ${checked ? 'checked' : ''}">
                    <input type="checkbox" data-key="${key}" data-repos="${ex.repos}" ${checked ? 'checked' : ''}>
                    <span>S${sIdx + 1} : ${r} reps</span>
                </label>`;
            }).join('');

            let backoffHtml = '';
            if (backoff) {
                const bw = plan.rmKey === '1rm' ? Math.round((state.rms[ex.id] || ex.rmBase) * backoff.pct * 2) / 2 : null;
                backoffHtml = `<div class="prog-backoff">Back-off : ${backoff.sets}×${backoff.reps} reps${bw ? ` @ ${bw} kg` : ''}</div>`;
            }

            el.innerHTML += `
                <div class="prog-exercise">
                    <div class="prog-ex-header">
                        <span class="prog-ex-name">${ex.nom}</span>
                        <span class="prog-ex-meta">${ex.tempo} · ${ex.repos}${weightStr ? ' · ' + weightStr : ''}</span>
                    </div>
                    <div class="prog-sets">${setsHtml}</div>
                    ${backoffHtml}
                </div>`;
        });

        // Timer placeholder
        const timerEl = document.getElementById('restTimer');
        if (timerEl) timerEl.style.display = 'none';
    }

    // ── Navigation ────────────────────────────────────────────────────────────

    function renderNav() {
        const plan = PLANS[state.type];
        document.getElementById('btnPrevDay').disabled = state.day === 0;
        document.getElementById('btnNextDay').disabled = state.day >= plan.days.length - 1;
        document.getElementById('btnPrevWeek').disabled = state.week <= 1;
        document.getElementById('btnNextWeek').disabled = state.week >= 4;

        // Onglets jours
        const dayTabs = document.getElementById('progDayTabs');
        if (dayTabs) {
            dayTabs.innerHTML = plan.days.map((d, i) =>
                `<button class="prog-day-tab ${i === state.day ? 'active' : ''}" data-day="${i}">J${i + 1}</button>`
            ).join('');
        }
    }

    function renderRMInputs() {
        const plan = PLANS[state.type];
        const wrap = document.getElementById('progRMWrap');
        if (!wrap || !plan.rmKey) { if (wrap) wrap.style.display = 'none'; return; }
        wrap.style.display = '';
        const ids = [...new Set(plan.days.flatMap(d => d.exercices.map(e => e.id)))];
        const allEx = plan.days.flatMap(d => d.exercices);
        wrap.innerHTML = `
            <div class="prog-rm-header">${plan.rmLabel} par exercice (kg)</div>
            <div class="prog-rm-grid">
            ${ids.map(id => {
                const ex = allEx.find(e => e.id === id);
                if (!ex) return '';
                const val = state.rms[id] ?? ex.rmBase;
                return `<div class="prog-rm-field">
                    <label>${ex.nom}</label>
                    <input type="number" class="rm-input" data-id="${id}" value="${val || ''}" min="0" step="0.5" placeholder="${ex.rmBase || 0}">
                </div>`;
            }).join('')}
            </div>`;
        wrap.querySelectorAll('.rm-input').forEach(inp => {
            inp.addEventListener('change', () => {
                state.rms[inp.dataset.id] = parseFloat(inp.value) || 0;
                saveState(state);
                renderProgramme();
            });
        });
    }

    // ── Enregistrer la séance ─────────────────────────────────────────────────

    function enregistrerSeance() {
        const plan = PLANS[state.type];
        const day = plan.days[state.day];
        const weekIdx = state.week - 1;

        const exercicesList = day.exercices.map(ex => {
            const reps = ex.semaines[weekIdx]?.filter(r => r !== null) || [];
            const w = plan.rmKey ? getWeight(ex, weekIdx, plan) : null;
            return `${ex.nom}${w ? ` @${w}kg` : ''} — ${reps.join('/')} reps`;
        }).join(', ');

        const dureeEstimee = day.exercices.reduce((sum, ex) => {
            const repos = parseRepos(ex.repos);
            const sets = (ex.semaines[weekIdx] || []).filter(r => r !== null).length;
            return sum + sets * (1.5 * 60 + repos);
        }, 0);

        const dureeMin = Math.round(dureeEstimee / 60);
    const poids = JSON.parse(localStorage.getItem('bodySettings') || 'null')?.poids || 75;
    const kcal = Math.round(4.0 * poids * (dureeMin / 60));

    const seanceData = loadData('seanceData');
        seanceData.push({
            date: new Date().toISOString().split('T')[0],
            type: 'musculation',
            duree: dureeMin,
            kcal,
            ressenti: 3,
            exercices: exercicesList,
        });
        saveData('seanceData', seanceData);
        window.dispatchEvent(new CustomEvent('suivi:dataChanged'));
        showFeedback(document.getElementById('programmeFeedback'), 'Séance enregistrée dans l\'onglet Séances !');
    }

    // ── Init ──────────────────────────────────────────────────────────────────

    function fullRender() {
        renderNav();
        renderRMInputs();
        renderProgramme();
    }

    // Sélection type de plan
    document.querySelectorAll('.prog-type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.prog-type-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.type = btn.dataset.plan;
            state.day = 0;
            state.checked = {};
            saveState(state);
            fullRender();
        });
        if (btn.dataset.plan === state.type) btn.classList.add('active');
    });

    // Navigation semaine
    document.getElementById('btnPrevWeek')?.addEventListener('click', () => {
        if (state.week > 1) { state.week--; state.checked = {}; saveState(state); fullRender(); }
    });
    document.getElementById('btnNextWeek')?.addEventListener('click', () => {
        if (state.week < 4) { state.week++; state.checked = {}; saveState(state); fullRender(); }
    });

    // Navigation jour
    document.getElementById('btnPrevDay')?.addEventListener('click', () => {
        if (state.day > 0) { state.day--; saveState(state); renderProgramme(); renderNav(); }
    });
    document.getElementById('btnNextDay')?.addEventListener('click', () => {
        const plan = PLANS[state.type];
        if (state.day < plan.days.length - 1) { state.day++; saveState(state); renderProgramme(); renderNav(); }
    });

    // Onglets jours (délégation)
    document.getElementById('progDayTabs')?.addEventListener('click', e => {
        const btn = e.target.closest('.prog-day-tab');
        if (!btn) return;
        state.day = parseInt(btn.dataset.day);
        saveState(state);
        renderProgramme();
        renderNav();
    });

    // Checkboxes séries (délégation)
    document.getElementById('programmeContent')?.addEventListener('change', e => {
        const cb = e.target;
        if (cb.type !== 'checkbox') return;
        const key = cb.dataset.key;
        const repos = cb.dataset.repos;
        if (cb.checked) {
            state.checked[key] = true;
            startTimer(parseRepos(repos));
            cb.closest('.prog-set-check')?.classList.add('checked');
        } else {
            delete state.checked[key];
            cb.closest('.prog-set-check')?.classList.remove('checked');
        }
        saveState(state);
    });

    // Enregistrer la séance
    document.getElementById('btnSaveSeance')?.addEventListener('click', enregistrerSeance);

    fullRender();
    window.addEventListener('suivi:dataChanged', () => { /* rien à re-rendre ici */ });
});
