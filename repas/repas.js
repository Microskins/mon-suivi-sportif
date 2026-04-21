document.addEventListener('DOMContentLoaded', function () {
    const tableBody = document.querySelector('#repasTable tbody');
    const feedbackEl = document.getElementById('repasFeedback');

    document.getElementById('date-repas').value = new Date().toLocaleDateString('sv');

    const MEALS = [
        { key: 'petitDejeuner', label: '🌅 Petit-déjeuner' },
        { key: 'dejeuner',      label: '☀️ Déjeuner'       },
        { key: 'collation',     label: '🍎 Collation'       },
        { key: 'diner',         label: '🌙 Dîner'           },
    ];

    // ── Base d'aliments (pour 100 g) ─────────────────────────────────────────

    const FOOD_DB_BASE = [
        { nom: 'Avocat',             prot: 2,    gluc: 3.5,  lip: 22,   kcal: 220   },
        { nom: 'Banane',             prot: 1.5,  gluc: 20,   lip: 0,    kcal: 86    },
        { nom: 'Beurre',             prot: 0.7,  gluc: 0.5,  lip: 80,   kcal: 724.8 },
        { nom: 'Bœuf',              prot: 22,   gluc: 0,    lip: 7,    kcal: 151   },
        { nom: 'Broccolis',          prot: 3,    gluc: 3,    lip: 0.3,  kcal: 26.7  },
        { nom: 'Chocolat noir',      prot: 6,    gluc: 49,   lip: 31,   kcal: 499   },
        { nom: 'Chocolat noir 86%',  prot: 8.5,  gluc: 18,   lip: 56,   kcal: 643   },
        { nom: 'Chou-fleur',         prot: 1.3,  gluc: 6.5,  lip: 0.1,  kcal: 32.1  },
        { nom: 'Cottage cheese',     prot: 12,   gluc: 4,    lip: 4,    kcal: 100   },
        { nom: 'Épinards hachés',   prot: 2.5,  gluc: 2.5,  lip: 1.5,  kcal: 33.5  },
        { nom: 'Farine',             prot: 10,   gluc: 75,   lip: 1.5,  kcal: 353.5 },
        { nom: 'Flocons d\'avoine',  prot: 11.1, gluc: 61.5, lip: 7.1,  kcal: 354.3 },
        { nom: 'Fromage blanc 0%',   prot: 11,   gluc: 3,    lip: 0.2,  kcal: 57.8  },
        { nom: 'Haricots rouges',    prot: 8.4,  gluc: 13,   lip: 0.8,  kcal: 92.8  },
        { nom: 'Huile d\'olive',     prot: 0,    gluc: 0,    lip: 92,   kcal: 828   },
        { nom: 'Lait 1.5%',          prot: 3.2,  gluc: 4.9,  lip: 1.5,  kcal: 45.9  },
        { nom: 'Merguez',            prot: 2,    gluc: 8,    lip: 78,   kcal: 544   },
        { nom: 'Oignons',            prot: 1.4,  gluc: 9,    lip: 0.2,  kcal: 43.4  },
        { nom: 'Patate douce',       prot: 1.6,  gluc: 21,   lip: 0.1,  kcal: 91.3  },
        { nom: 'Pâtes crues',       prot: 12.5, gluc: 72,   lip: 1.5,  kcal: 351.5 },
        { nom: 'Peanut butter',      prot: 26,   gluc: 17,   lip: 49,   kcal: 613   },
        { nom: 'Petits pois',        prot: 4.9,  gluc: 11,   lip: 0.7,  kcal: 69.9  },
        { nom: 'Pomme',              prot: 0.3,  gluc: 12,   lip: 0.3,  kcal: 51.9  },
        { nom: 'Poulet',             prot: 23,   gluc: 0,    lip: 1.5,  kcal: 105.5 },
        { nom: 'Raisins',            prot: 0.6,  gluc: 15,   lip: 0.7,  kcal: 68.7  },
    ];

    function getFoodDB() {
        const custom = JSON.parse(localStorage.getItem('customFoods') || '[]');
        return [...FOOD_DB_BASE, ...custom].sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
    }

    // ── Calculateur d'aliments ────────────────────────────────────────────────

    function initFoodCalculator() {
        const input = document.getElementById('foodSearch');
        const dropdown = document.getElementById('foodDropdown');
        const qtyInput = document.getElementById('foodQty');
        const mealSel = document.getElementById('foodMealTarget');
        const addBtn = document.getElementById('foodAddBtn');
        const customBtn = document.getElementById('foodCustomBtn');
        if (!input) return;

        let selectedFood = null;

        function showDropdown(query) {
            const db = getFoodDB();
            const q = query.toLowerCase();
            const matches = q ? db.filter(f => f.nom.toLowerCase().includes(q)).slice(0, 8) : [];
            if (!matches.length) { dropdown.style.display = 'none'; return; }
            dropdown.innerHTML = matches.map(f =>
                `<div class="food-dd-item" data-nom="${f.nom}">${f.nom} <span class="food-dd-kcal">${f.kcal} kcal/100g</span></div>`
            ).join('');
            dropdown.style.display = '';
        }

        input.addEventListener('input', () => { selectedFood = null; showDropdown(input.value); });
        input.addEventListener('focus', () => { if (input.value) showDropdown(input.value); });

        dropdown.addEventListener('mousedown', e => {
            const item = e.target.closest('.food-dd-item');
            if (!item) return;
            const nom = item.dataset.nom;
            selectedFood = getFoodDB().find(f => f.nom === nom);
            input.value = nom;
            dropdown.style.display = 'none';
        });

        document.addEventListener('click', e => {
            if (!e.target.closest('#foodCalcPanel')) dropdown.style.display = 'none';
        });

        addBtn.addEventListener('click', () => {
            if (!selectedFood) {
                const nom = input.value.trim();
                if (!nom) return;
                selectedFood = getFoodDB().find(f => f.nom.toLowerCase() === nom.toLowerCase());
            }
            if (!selectedFood) { showFeedback(feedbackEl, 'Aliment introuvable dans la base.', 'error'); return; }
            const qty = parseFloat(qtyInput.value) || 100;
            const ratio = qty / 100;
            const mealKey = mealSel.value;
            const card = document.querySelector(`.repas-card[data-meal="${mealKey}"]`);
            if (!card) return;

            const add = (sel, val) => {
                const el = card.querySelector(sel);
                el.value = Math.round(((parseFloat(el.value) || 0) + val) * 10) / 10;
            };
            add('.r-cal',  selectedFood.kcal * ratio);
            add('.r-prot', selectedFood.prot * ratio);
            add('.r-gluc', selectedFood.gluc * ratio);
            add('.r-lip',  selectedFood.lip  * ratio);

            const aliEl = card.querySelector('.r-aliments');
            const existing = aliEl.value.trim();
            aliEl.value = existing ? `${existing}, ${selectedFood.nom} ${qty}g` : `${selectedFood.nom} ${qty}g`;

            input.value = '';
            qtyInput.value = 100;
            selectedFood = null;
            renderMacroProgress();
        });

        customBtn.addEventListener('click', () => {
            openModal({
                title: 'Ajouter un aliment personnalisé',
                fields: [
                    { key: 'nom',  label: 'Nom',             type: 'text',   placeholder: 'Mon aliment' },
                    { key: 'kcal', label: 'Calories (kcal)',  type: 'number', step: 0.1, min: 0 },
                    { key: 'prot', label: 'Protéines (g)',    type: 'number', step: 0.1, min: 0 },
                    { key: 'gluc', label: 'Glucides (g)',     type: 'number', step: 0.1, min: 0 },
                    { key: 'lip',  label: 'Lipides (g)',      type: 'number', step: 0.1, min: 0 },
                ],
                values: { nom: '', kcal: 0, prot: 0, gluc: 0, lip: 0 },
                onSave: (vals) => {
                    if (!vals.nom.trim()) return;
                    const custom = JSON.parse(localStorage.getItem('customFoods') || '[]');
                    custom.push({ nom: vals.nom.trim(), kcal: vals.kcal, prot: vals.prot, gluc: vals.gluc, lip: vals.lip });
                    localStorage.setItem('customFoods', JSON.stringify(custom));
                    const pid = localStorage.getItem('currentProfileId');
                    if (pid) localStorage.setItem(`profile_${pid}_customFoods`, JSON.stringify(custom));
                    showFeedback(feedbackEl, `"${vals.nom}" ajouté à ta base d'aliments !`);
                }
            });
        });
    }

    // ── Barre de progression macros vs plan ──────────────────────────────────

    function getCurrentTotals() {
        return MEALS.reduce((acc, m) => {
            const card = document.querySelector(`.repas-card[data-meal="${m.key}"]`);
            if (!card) return acc;
            acc.kcal += parseFloat(card.querySelector('.r-cal').value)  || 0;
            acc.prot += parseFloat(card.querySelector('.r-prot').value) || 0;
            acc.gluc += parseFloat(card.querySelector('.r-gluc').value) || 0;
            acc.lip  += parseFloat(card.querySelector('.r-lip').value)  || 0;
            return acc;
        }, { kcal: 0, prot: 0, gluc: 0, lip: 0 });
    }

    function renderMacroProgress() {
        const wrap = document.getElementById('macroProgressWrap');
        if (!wrap) return;

        const plan = JSON.parse(localStorage.getItem('nutritionPlan') || 'null');
        if (!plan) { wrap.style.display = 'none'; return; }

        const PLANS_DATA = {
            seche: [
                { kcalT: 3335, kcalR: 2835, prot: 159, glucT: 466, glucR: 336, lipT: 93, lipR: 95 },
                { kcalT: 3335, kcalR: 2835, prot: 159, glucT: 466, glucR: 336, lipT: 93, lipR: 95 },
                { kcalT: 3169, kcalR: 2835, prot: 159, glucT: 433, glucR: 336, lipT: 89, lipR: 95 },
                { kcalT: 3002, kcalR: 2835, prot: 159, glucT: 403, glucR: 336, lipT: 84, lipR: 95 },
            ],
            masse: [
                { kcalT: 3669, kcalR: 3335, prot: 159, glucT: 529, glucR: 423, lipT: 102, lipR: 112 },
                { kcalT: 3669, kcalR: 3335, prot: 159, glucT: 529, glucR: 423, lipT: 102, lipR: 112 },
                { kcalT: 3836, kcalR: 3335, prot: 159, glucT: 560, glucR: 423, lipT: 107, lipR: 112 },
                { kcalT: 4002, kcalR: 3335, prot: 159, glucT: 590, glucR: 423, lipT: 112, lipR: 112 },
            ]
        };

        const weekData = PLANS_DATA[plan.type]?.[(plan.week || 1) - 1];
        if (!weekData) { wrap.style.display = 'none'; return; }

        wrap.style.display = '';
        const totals = getCurrentTotals();
        const planLabel = plan.type === 'seche' ? 'Sèche' : 'Prise de masse';

        const bar = (val, target, unit) => {
            const pct = target ? Math.min(100, Math.round(val / target * 100)) : 0;
            const color = pct > 105 ? '#e53e3e' : pct >= 90 ? '#48bb78' : 'var(--primary)';
            return `<div class="mp-bar-wrap">
                <div class="mp-bar-bg"><div class="mp-bar-fill" style="width:${pct}%;background:${color}"></div></div>
                <span class="mp-bar-text">${Math.round(val)}${unit} / ${target}${unit} (${pct}%)</span>
            </div>`;
        };

        wrap.innerHTML = `
            <div class="macro-progress">
                <div class="mp-header">
                    <span class="mp-title">Plan <strong>${planLabel} S${plan.week}</strong> — jour training</span>
                </div>
                <div class="mp-rows">
                    <div class="mp-row"><span class="mp-label">Calories</span>${bar(totals.kcal, weekData.kcalT, ' kcal')}</div>
                    <div class="mp-row"><span class="mp-label">Protéines</span>${bar(totals.prot, weekData.prot, 'g')}</div>
                    <div class="mp-row"><span class="mp-label">Glucides</span>${bar(totals.gluc, weekData.glucT, 'g')}</div>
                    <div class="mp-row"><span class="mp-label">Lipides</span>${bar(totals.lip, weekData.lipT, 'g')}</div>
                </div>
            </div>`;
    }

    // ── Lecture d'une carte repas ─────────────────────────────────────────────

    function readCard(card) {
        return {
            aliments:  card.querySelector('.r-aliments').value.trim(),
            calories:  parseFloat(card.querySelector('.r-cal').value)  || 0,
            proteines: parseFloat(card.querySelector('.r-prot').value) || 0,
            glucides:  parseFloat(card.querySelector('.r-gluc').value) || 0,
            lipides:   parseFloat(card.querySelector('.r-lip').value)  || 0,
        };
    }

    function fillCard(card, meal) {
        card.querySelector('.r-aliments').value = meal?.aliments  || '';
        card.querySelector('.r-cal').value       = meal?.calories  || '';
        card.querySelector('.r-prot').value      = meal?.proteines || '';
        card.querySelector('.r-gluc').value      = meal?.glucides  || '';
        card.querySelector('.r-lip').value       = meal?.lipides   || '';
    }

    function clearAllCards() {
        document.querySelectorAll('.repas-card').forEach(card => fillCard(card, null));
    }

    // ── Totaux d'une journée ──────────────────────────────────────────────────

    function totaux(jour) {
        return MEALS.reduce((acc, m) => {
            const meal = jour[m.key] || {};
            acc.calories  += meal.calories  || 0;
            acc.proteines += meal.proteines || 0;
            acc.glucides  += meal.glucides  || 0;
            acc.lipides   += meal.lipides   || 0;
            return acc;
        }, { calories: 0, proteines: 0, glucides: 0, lipides: 0 });
    }

    // ── Rendu du tableau ──────────────────────────────────────────────────────

    function renderTable() {
        const data = loadData('repasData');
        const sorted = [...data].sort((a, b) => b.date.localeCompare(a.date));
        tableBody.innerHTML = '';

        sorted.forEach((jour) => {
            const idx = data.indexOf(jour);
            const t = totaux(jour);
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${jour.date}</td>
                <td>${t.calories} kcal</td>
                <td>${t.proteines} g</td>
                <td>${t.glucides} g</td>
                <td>${t.lipides} g</td>
                <td class="actions-cell">
                    <button class="btn-detail" data-index="${idx}" title="Détail">🔍</button>
                    <button class="btn-edit"   data-index="${idx}" title="Modifier">✎</button>
                    <button class="btn-delete" data-index="${idx}" title="Supprimer">✕</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }

    // ── Popup détail ──────────────────────────────────────────────────────────

    function showDetail(jour) {
        const t = totaux(jour);
        let html = `<p style="margin:0 0 14px;font-weight:600;color:#4a5568">${jour.date}</p>`;
        MEALS.forEach(m => {
            const meal = jour[m.key];
            if (!meal || (!meal.calories && !meal.aliments)) return;
            html += `
                <div class="detail-meal">
                    <div class="detail-meal-title">${m.label}</div>
                    ${meal.aliments ? `<div class="detail-aliments">${meal.aliments}</div>` : ''}
                    <div class="detail-macros">
                        <span>${meal.calories} kcal</span>
                        <span>${meal.proteines} g prot.</span>
                        <span>${meal.glucides} g gluc.</span>
                        <span>${meal.lipides} g lip.</span>
                    </div>
                </div>`;
        });
        html += `
            <div class="detail-total">
                <span>Total : <strong>${t.calories} kcal</strong></span>
                <span>${t.proteines} g prot.</span>
                <span>${t.glucides} g gluc.</span>
                <span>${t.lipides} g lip.</span>
            </div>`;
        openInfoModal(`Détail du ${jour.date}`, html);
    }

    // ── Clics tableau ─────────────────────────────────────────────────────────

    tableBody.addEventListener('click', function (e) {
        const btn = e.target.closest('button');
        if (!btn) return;
        const idx = parseInt(btn.getAttribute('data-index'));
        const data = loadData('repasData');
        const jour = data[idx];

        if (btn.classList.contains('btn-delete')) {
            if (!confirm('Supprimer cette journée de repas ? Cette action est irréversible.')) return;
            data.splice(idx, 1);
            saveData('repasData', data);
            renderTable();
        }
        if (btn.classList.contains('btn-detail')) { showDetail(jour); }
        if (btn.classList.contains('btn-edit')) {
            document.getElementById('date-repas').value = jour.date;
            MEALS.forEach(m => {
                const card = document.querySelector(`.repas-card[data-meal="${m.key}"]`);
                fillCard(card, jour[m.key]);
            });
            data.splice(idx, 1);
            saveData('repasData', data);
            renderTable();
            renderMacroProgress();
            showFeedback(feedbackEl, 'Journée chargée — modifie et enregistre.');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });

    // ── Enregistrement ────────────────────────────────────────────────────────

    document.getElementById('btn-save-repas').addEventListener('click', function () {
        const date = document.getElementById('date-repas').value;
        if (!date) { showFeedback(feedbackEl, 'Choisis une date.', 'error'); return; }
        const jour = { date };
        MEALS.forEach(m => {
            const card = document.querySelector(`.repas-card[data-meal="${m.key}"]`);
            jour[m.key] = readCard(card);
        });
        const data = loadData('repasData');
        const existingIdx = data.findIndex(j => j.date === date);
        if (existingIdx >= 0) data[existingIdx] = jour; else data.push(jour);
        saveData('repasData', data);
        renderTable();
        clearAllCards();
        document.getElementById('date-repas').value = new Date().toLocaleDateString('sv');
        window.dispatchEvent(new CustomEvent('suivi:dataChanged'));
        showFeedback(feedbackEl, 'Journée enregistrée !');
    });

    // Update macro bars when macro inputs change
    document.querySelectorAll('.r-cal, .r-prot, .r-gluc, .r-lip').forEach(el => {
        el.addEventListener('input', renderMacroProgress);
    });

    initFoodCalculator();
    renderMacroProgress();
    renderTable();
    window.addEventListener('suivi:dataChanged', () => { renderTable(); renderMacroProgress(); });
});
