document.addEventListener('DOMContentLoaded', function() {
    const sommeilForm = document.getElementById('sommeilForm');
    const sommeilTableBody = document.querySelector('#sommeilTable tbody');
    const feedbackEl = document.getElementById('sommeilFeedback');

    document.getElementById('date-sommeil').valueAsDate = new Date();

    const FIELDS = [
        { key: 'date',       label: 'Date',                 type: 'date'   },
        { key: 'tempsTotal', label: 'Temps total (min)',     type: 'number', min: 0 },
        { key: 'rem',        label: 'REM (min)',             type: 'number', min: 0 },
        { key: 'profond',    label: 'Sommeil profond (min)', type: 'number', min: 0 },
        { key: 'leger',      label: 'Sommeil léger (min)',   type: 'number', min: 0 },
        { key: 'apnee',      label: 'Apnée (min)',           type: 'number', min: 0 },
        { key: 'bpm',        label: 'BPM',                  type: 'number', min: 0 },
        { key: 'oxygen',     label: 'Oxygène (%)',           type: 'number', min: 0, max: 100 },
    ];

    function renderTable() {
        const data = loadData('sommeilData');
        const sorted = [...data].sort((a, b) => b.date.localeCompare(a.date));
        sommeilTableBody.innerHTML = '';
        sorted.forEach((entry) => {
            const originalIdx = data.indexOf(entry);
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${entry.date}</td>
                <td>${entry.apnee || '—'}</td>
                <td>${entry.rem || '—'}</td>
                <td>${entry.profond || '—'}</td>
                <td>${entry.leger || '—'}</td>
                <td>${entry.tempsTotal || '—'}</td>
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

    sommeilTableBody.addEventListener('click', function(e) {
        const idx = parseInt(e.target.getAttribute('data-index'));
        const data = loadData('sommeilData');

        if (e.target.classList.contains('btn-delete')) {
            data.splice(idx, 1);
            saveData('sommeilData', data);
            renderTable();
        }

        if (e.target.classList.contains('btn-edit')) {
            openModal({
                title: 'Modifier la nuit de sommeil',
                fields: FIELDS,
                values: data[idx],
                onSave: (vals) => {
                    data[idx] = {
                        ...data[idx],
                        date:       vals.date,
                        tempsTotal: parseFloat(vals.tempsTotal) || 0,
                        rem:        parseFloat(vals.rem)        || 0,
                        profond:    parseFloat(vals.profond)    || 0,
                        leger:      parseFloat(vals.leger)      || 0,
                        apnee:      parseFloat(vals.apnee)      || 0,
                        bpm:        parseFloat(vals.bpm)        || 0,
                        oxygen:     parseFloat(vals.oxygen)     || 0,
                    };
                    saveData('sommeilData', data);
                    renderTable();
                    window.dispatchEvent(new CustomEvent('suivi:dataChanged'));
                    showFeedback(feedbackEl, 'Nuit modifiée !');
                }
            });
        }
    });

    sommeilForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const entry = {
            date:       document.getElementById('date-sommeil').value,
            apnee:      parseFloat(document.getElementById('apnee').value)        || 0,
            rem:        parseFloat(document.getElementById('rem').value)          || 0,
            profond:    parseFloat(document.getElementById('profond').value)      || 0,
            leger:      parseFloat(document.getElementById('leger').value)        || 0,
            tempsTotal: parseFloat(document.getElementById('temps-total').value)  || 0,
            bpm:        parseFloat(document.getElementById('bpm').value)          || 0,
            oxygen:     parseFloat(document.getElementById('oxygen').value)       || 0,
        };
        const data = loadData('sommeilData');
        data.push(entry);
        saveData('sommeilData', data);
        renderTable();
        sommeilForm.reset();
        document.getElementById('date-sommeil').valueAsDate = new Date();
        showFeedback(feedbackEl, 'Nuit enregistrée !');
    });

    renderTable();
    window.addEventListener('suivi:dataChanged', renderTable);
});
