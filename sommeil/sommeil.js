document.addEventListener('DOMContentLoaded', function() {
    const sommeilForm = document.getElementById('sommeilForm');
    const sommeilTableBody = document.querySelector('#sommeilTable tbody');
    const feedbackEl = document.getElementById('sommeilFeedback');

    document.getElementById('date-sommeil').value = new Date().toLocaleDateString('sv');

    // ── Conversion durées ────────────────────────────────────

    // minutes → "1h30"
    function minToHM(min) {
        if (!min && min !== 0) return '—';
        if (min === 0) return '—';
        const h = Math.floor(min / 60);
        const m = Math.round(min % 60);
        if (h === 0) return `${m}min`;
        if (m === 0) return `${h}h`;
        return `${h}h${String(m).padStart(2, '0')}`;
    }

    // "1h30" / "1:30" / "90" / "1.5" → minutes
    function hmToMin(str) {
        if (!str) return 0;
        str = String(str).trim().toLowerCase();

        // Format "1h30" ou "1h"
        const hm = str.match(/^(\d+)h(\d*)$/);
        if (hm) return parseInt(hm[1]) * 60 + (parseInt(hm[2]) || 0);

        // Format "1:30" ou "0:45"
        const colon = str.match(/^(\d+):(\d{1,2})$/);
        if (colon) return parseInt(colon[1]) * 60 + parseInt(colon[2]);

        // Nombre décimal en heures "1.5"
        if (str.includes('.')) return Math.round(parseFloat(str) * 60);

        // Nombre seul → minutes brutes
        const n = parseInt(str);
        return isNaN(n) ? 0 : n;
    }

    // minutes → "1h30" pour pré-remplir les inputs
    function minToHMInput(min) {
        if (!min) return '';
        const h = Math.floor(min / 60);
        const m = Math.round(min % 60);
        if (h === 0) return `0h${String(m).padStart(2, '0')}`;
        return `${h}h${String(m).padStart(2, '0')}`;
    }

    // ── Champs modale ────────────────────────────────────────

    const FIELDS = [
        { key: 'date',       label: 'Date',                type: 'date' },
        { key: 'tempsTotal', label: 'Temps total',         type: 'text', placeholder: 'ex : 7h30' },
        { key: 'rem',        label: 'REM',                 type: 'text', placeholder: 'ex : 1h30' },
        { key: 'profond',    label: 'Sommeil profond',     type: 'text', placeholder: 'ex : 1h15' },
        { key: 'leger',      label: 'Sommeil léger',       type: 'text', placeholder: 'ex : 2h00' },
        { key: 'apnee',      label: 'Apnée (évén./h)',      type: 'number', step: 0.1, min: 0 },
        { key: 'bpm',        label: 'BPM',                 type: 'number', min: 0 },
        { key: 'oxygen',     label: 'Oxygène (%)',          type: 'number', min: 0, max: 100 },
    ];

    // ── Rendu tableau ────────────────────────────────────────

    function renderTable() {
        const data = loadData('sommeilData');
        const sorted = [...data].sort((a, b) => b.date.localeCompare(a.date));
        sommeilTableBody.innerHTML = '';
        sorted.forEach((entry) => {
            const originalIdx = data.indexOf(entry);
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${entry.date}</td>
                <td>${entry.apnee ?? '—'}</td>
                <td>${minToHM(entry.rem)}</td>
                <td>${minToHM(entry.profond)}</td>
                <td>${minToHM(entry.leger)}</td>
                <td>${minToHM(entry.tempsTotal)}</td>
                <td>${entry.bpm || '—'}</td>
                <td>${entry.oxygen || '—'}</td>
                <td class="actions-cell">
                    <button class="btn-edit"   data-index="${originalIdx}" title="Modifier">✎</button>
                    <button class="btn-delete" data-index="${originalIdx}" title="Supprimer">✕</button>
                </td>
            `;
            sommeilTableBody.appendChild(row);
        });
    }

    // ── Clics tableau (edit / delete) ────────────────────────

    sommeilTableBody.addEventListener('click', function(e) {
        const idx = parseInt(e.target.getAttribute('data-index'));
        const data = loadData('sommeilData');

        if (e.target.classList.contains('btn-delete')) {
            if (!confirm('Supprimer cette nuit de sommeil ? Cette action est irréversible.')) return;
            data.splice(idx, 1);
            saveData('sommeilData', data);
            renderTable();
        }

        if (e.target.classList.contains('btn-edit')) {
            const entry = data[idx];
            openModal({
                title: 'Modifier la nuit de sommeil',
                fields: FIELDS,
                values: {
                    date:       entry.date,
                    tempsTotal: minToHMInput(entry.tempsTotal),
                    rem:        minToHMInput(entry.rem),
                    profond:    minToHMInput(entry.profond),
                    leger:      minToHMInput(entry.leger),
                    apnee:      entry.apnee || '',
                    bpm:        entry.bpm    || '',
                    oxygen:     entry.oxygen || '',
                },
                onSave: (vals) => {
                    data[idx] = {
                        ...entry,
                        date:       vals.date,
                        tempsTotal: hmToMin(vals.tempsTotal),
                        rem:        hmToMin(vals.rem),
                        profond:    hmToMin(vals.profond),
                        leger:      hmToMin(vals.leger),
                        apnee:      parseFloat(vals.apnee) || 0,
                        bpm:        parseFloat(vals.bpm)    || 0,
                        oxygen:     parseFloat(vals.oxygen) || 0,
                    };
                    saveData('sommeilData', data);
                    renderTable();
                    window.dispatchEvent(new CustomEvent('suivi:dataChanged'));
                    showFeedback(feedbackEl, 'Nuit modifiée !');
                }
            });
        }
    });

    // ── Formulaire d'ajout ───────────────────────────────────

    sommeilForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const entry = {
            date:       document.getElementById('date-sommeil').value,
            apnee:      parseFloat(document.getElementById('apnee').value) || 0,
            rem:        hmToMin(document.getElementById('rem').value),
            profond:    hmToMin(document.getElementById('profond').value),
            leger:      hmToMin(document.getElementById('leger').value),
            tempsTotal: hmToMin(document.getElementById('temps-total').value),
            bpm:        parseFloat(document.getElementById('bpm').value)    || 0,
            oxygen:     parseFloat(document.getElementById('oxygen').value) || 0,
        };
        const data = loadData('sommeilData');
        data.push(entry);
        saveData('sommeilData', data);
        renderTable();
        sommeilForm.reset();
        document.getElementById('date-sommeil').value = new Date().toLocaleDateString('sv');
        showFeedback(feedbackEl, 'Nuit enregistrée !');
    });

    renderTable();
    window.addEventListener('suivi:dataChanged', renderTable);
});
