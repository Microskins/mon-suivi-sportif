document.addEventListener('DOMContentLoaded', function () {
    const tableBody = document.querySelector('#repasTable tbody');
    const feedbackEl = document.getElementById('repasFeedback');

    document.getElementById('date-repas').valueAsDate = new Date();

    const MEALS = [
        { key: 'petitDejeuner', label: '🌅 Petit-déjeuner' },
        { key: 'dejeuner',      label: '☀️ Déjeuner'       },
        { key: 'collation',     label: '🍎 Collation'       },
        { key: 'diner',         label: '🌙 Dîner'           },
    ];

    // ── Lecture d'une carte repas ────────────────────────────

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

    // ── Totaux d'une journée ─────────────────────────────────

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

    // ── Rendu du tableau ─────────────────────────────────────

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

    // ── Popup détail ─────────────────────────────────────────

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

    // ── Clics tableau ────────────────────────────────────────

    tableBody.addEventListener('click', function (e) {
        const btn = e.target.closest('button');
        if (!btn) return;
        const idx = parseInt(btn.getAttribute('data-index'));
        const data = loadData('repasData');
        const jour = data[idx];

        if (btn.classList.contains('btn-delete')) {
            data.splice(idx, 1);
            saveData('repasData', data);
            renderTable();
        }

        if (btn.classList.contains('btn-detail')) {
            showDetail(jour);
        }

        if (btn.classList.contains('btn-edit')) {
            // Charger les données dans les cartes + changer la date
            document.getElementById('date-repas').value = jour.date;
            MEALS.forEach(m => {
                const card = document.querySelector(`.repas-card[data-meal="${m.key}"]`);
                fillCard(card, jour[m.key]);
            });
            // Supprimer l'ancienne entrée (sera recréée à l'enregistrement)
            data.splice(idx, 1);
            saveData('repasData', data);
            renderTable();
            showFeedback(feedbackEl, 'Journée chargée — modifie et enregistre.');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });

    // ── Enregistrement ───────────────────────────────────────

    document.getElementById('btn-save-repas').addEventListener('click', function () {
        const date = document.getElementById('date-repas').value;
        if (!date) { showFeedback(feedbackEl, 'Choisis une date.', 'error'); return; }

        const jour = { date };
        MEALS.forEach(m => {
            const card = document.querySelector(`.repas-card[data-meal="${m.key}"]`);
            jour[m.key] = readCard(card);
        });

        const data = loadData('repasData');
        // Remplacer si la date existe déjà
        const existingIdx = data.findIndex(j => j.date === date);
        if (existingIdx >= 0) data[existingIdx] = jour;
        else data.push(jour);

        saveData('repasData', data);
        renderTable();
        clearAllCards();
        document.getElementById('date-repas').valueAsDate = new Date();
        window.dispatchEvent(new CustomEvent('suivi:dataChanged'));
        showFeedback(feedbackEl, 'Journée enregistrée !');
    });

    renderTable();
    window.addEventListener('suivi:dataChanged', renderTable);
});
