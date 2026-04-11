// ============================================================
//  SCRIPT.JS — Onglets + graphique récapitulatif + utilitaires
//  Tout le HTML est inline dans index.html (pas de fetch)
// ============================================================

document.addEventListener('DOMContentLoaded', function () {

    // ── Gestion des onglets ──────────────────────────────────
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');

            tabContents.forEach(c => c.classList.remove('active'));
            tabButtons.forEach(b => b.classList.remove('active'));

            document.getElementById(tabId).classList.add('active');
            button.classList.add('active');

            if (tabId === 'accueil') updateRecapChart();
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
            const sorted = [...bodyHistory].sort((a, b) => a.date.localeCompare(b.date));
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

    // ── Utilitaires globaux ──────────────────────────────────

    const PROFILE_DATA_KEYS = ['bodySettings', 'bodyHistory', 'sommeilData', 'repasData', 'seanceData', 'gfitLastAutoImport', 'mensurationsData'];

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

    function doSwitchProfile(id) {
        const cur = getCurrentProfileId();
        if (cur) flushToProfile(cur);
        localStorage.setItem('currentProfileId', id);
        restoreFromProfile(id);
        renderProfileUI();
        updateRecapChart();
        window.dispatchEvent(new CustomEvent('suivi:dataChanged'));
        syncFromServer(id);
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
            btn.innerHTML = `<span>${p.emoji}</span><span style="flex:1">${p.name}</span>${p.pin ? '<span style="font-size:11px;opacity:0.5">🔒</span>' : ''}${p.id === currentId ? '<span style="font-size:11px;opacity:0.6;margin-left:4px">✓</span>' : ''}`;
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
            await fetch('/api/_global/profiles', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json', 'x-token': token },
                body:    JSON.stringify(getProfiles())
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

    window.loadData = function (key) {
        try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; }
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

    // Initialiser le graphique au démarrage
    updateRecapChart();

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
