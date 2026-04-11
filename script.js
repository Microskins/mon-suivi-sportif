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

    window.saveData = function (key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    };

    window.loadData = function (key) {
        try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; }
    };

    window.showFeedback = function (container, message, type = 'success') {
        const el = document.createElement('div');
        el.className = `feedback feedback-${type}`;
        el.textContent = message;
        container.appendChild(el);
        setTimeout(() => el.remove(), 3000);
    };

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
