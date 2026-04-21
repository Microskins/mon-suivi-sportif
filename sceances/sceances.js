document.addEventListener('DOMContentLoaded', function() {
    const seanceForm = document.getElementById('seanceForm');
    const tableBody  = document.querySelector('#seanceTable tbody');
    const feedbackEl = document.getElementById('seanceFeedback');

    document.getElementById('date-seance').value = new Date().toLocaleDateString('sv');

    const typeLabels = {
        'musculation': 'Musculation',
        'cardio':      'Cardio',
        'hiit':        'HIIT',
        'yoga':        'Yoga / Stretching',
        'sport-co':    'Sport collectif',
        'autre':       'Autre'
    };

    const ressentiLabels = { 1: '★☆☆☆☆', 2: '★★☆☆☆', 3: '★★★☆☆', 4: '★★★★☆', 5: '★★★★★' };

    const MET = {
        'musculation': 4.0,
        'cardio':      8.0,
        'hiit':        10.5,
        'yoga':        2.5,
        'sport-co':    7.0,
        'autre':       5.0,
    };

    function calculerKcal(type, dureeMin) {
        const settings = JSON.parse(localStorage.getItem('bodySettings') || 'null');
        const poids = settings?.poids;
        if (!poids) return null;
        const met = MET[type] || 5;
        return Math.round(met * poids * (dureeMin / 60));
    }

    document.getElementById('btn-calc-kcal').addEventListener('click', function () {
        const type    = document.getElementById('type-seance').value;
        const duree   = parseFloat(document.getElementById('duree').value) || 0;
        const settings = JSON.parse(localStorage.getItem('bodySettings') || 'null');

        if (!settings?.poids) { showFeedback(feedbackEl, '⚠️ Renseigne ton poids dans l\'onglet Body d\'abord.', 'error'); return; }
        if (!duree)            { showFeedback(feedbackEl, '⚠️ Entre d\'abord la durée de la séance.', 'error'); return; }

        const kcal = calculerKcal(type, duree);
        document.getElementById('kcal').value = kcal;
        showFeedback(feedbackEl, `⚡ ${kcal} kcal calculées (MET ${MET[type]||5} × ${settings.poids} kg × ${(duree/60).toFixed(2)} h) — tu peux ajuster.`);
    });

    // ── Rendu tableau séances ────────────────────────────────

    function renderTable() {
        const data = loadData('seanceData');
        const sorted = [...data].sort((a, b) => b.date.localeCompare(a.date));
        tableBody.innerHTML = '';
        sorted.forEach((entry) => {
            const originalIdx = data.indexOf(entry);
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${entry.date}</td>
                <td>${typeLabels[entry.type] || entry.type}</td>
                <td>${entry.duree ? entry.duree + ' min' : '—'}</td>
                <td>${entry.kcal ? entry.kcal + ' kcal' : '—'}</td>
                <td title="${entry.ressenti}/5">${ressentiLabels[entry.ressenti] || entry.ressenti}</td>
                <td class="notes-cell">${entry.exercices || '—'}</td>
                <td class="actions-cell">
                    <button class="btn-edit"   data-index="${originalIdx}" title="Modifier">✎</button>
                    <button class="btn-delete" data-index="${originalIdx}" title="Supprimer">✕</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }

    tableBody.addEventListener('click', function(e) {
        const btn = e.target.closest('button');
        if (!btn) return;
        const idx  = parseInt(btn.getAttribute('data-index'));
        const data = loadData('seanceData');

        if (btn.classList.contains('btn-delete')) {
            if (!confirm('Supprimer cette séance ? Cette action est irréversible.')) return;
            data.splice(idx, 1);
            saveData('seanceData', data);
            renderTable();
        }

        if (btn.classList.contains('btn-edit')) {
            openModal({
                title: 'Modifier la séance',
                fields: [
                    { key: 'date',      label: 'Date',             type: 'date' },
                    { key: 'type',      label: 'Type',             type: 'select', options: [['musculation','Musculation'],['cardio','Cardio'],['hiit','HIIT'],['yoga','Yoga / Stretching'],['sport-co','Sport collectif'],['autre','Autre']] },
                    { key: 'duree',     label: 'Durée (min)',       type: 'number', min: 0 },
                    { key: 'kcal',      label: 'Kcal brûlées',      type: 'number', min: 0 },
                    { key: 'ressenti',  label: 'Ressenti (1-5)',     type: 'select', options: [['1','1 — Très difficile'],['2','2 — Difficile'],['3','3 — Normal'],['4','4 — Bien'],['5','5 — Excellent']] },
                    { key: 'exercices', label: 'Exercices / Notes', type: 'textarea' },
                ],
                values: data[idx],
                onSave: (vals) => {
                    data[idx] = { ...data[idx], ...vals, duree: parseFloat(vals.duree)||0, kcal: parseFloat(vals.kcal)||0, ressenti: parseInt(vals.ressenti)||3 };
                    saveData('seanceData', data);
                    renderTable();
                    showFeedback(feedbackEl, 'Séance modifiée !');
                }
            });
        }
    });

    // ── Formulaire séance ────────────────────────────────────

    seanceForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const type  = document.getElementById('type-seance').value;
        const duree = parseFloat(document.getElementById('duree').value) || 0;
        let   kcal  = parseFloat(document.getElementById('kcal').value)  || 0;

        if (!kcal && duree) {
            const calc = calculerKcal(type, duree);
            if (calc) kcal = calc;
        }

        const entry = {
            date:      document.getElementById('date-seance').value,
            type,
            duree,
            kcal,
            ressenti:  parseInt(document.getElementById('ressenti').value),
            exercices: document.getElementById('exercices').value.trim()
        };
        const data = loadData('seanceData');
        data.push(entry);
        saveData('seanceData', data);

        if (entry.exercices) window.checkAndUpdateRecords?.(entry);

        renderTable();
        window.renderRecords?.();
        seanceForm.reset();
        document.getElementById('date-seance').value = new Date().toLocaleDateString('sv');
        document.getElementById('ressenti').value = '3';
        window.dispatchEvent(new CustomEvent('suivi:dataChanged'));
        showFeedback(feedbackEl, 'Séance enregistrée !');
    });

    renderTable();
    window.addEventListener('suivi:dataChanged', renderTable);
});
