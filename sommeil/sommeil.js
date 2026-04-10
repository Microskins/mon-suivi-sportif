document.addEventListener('DOMContentLoaded', function() {
    const sommeilForm = document.getElementById('sommeilForm');
    const sommeilTableBody = document.querySelector('#sommeilTable tbody');
    const feedbackEl = document.getElementById('sommeilFeedback');

    document.getElementById('date-sommeil').valueAsDate = new Date();

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
                <td>${entry.rem ?? '—'}</td>
                <td>${entry.profond ?? '—'}</td>
                <td>${entry.leger ?? '—'}</td>
                <td>${entry.tempsTotal ?? '—'}</td>
                <td>${entry.bpm ?? '—'}</td>
                <td>${entry.oxygen ?? '—'}</td>
                <td><button class="btn-delete" data-index="${originalIdx}" title="Supprimer">✕</button></td>
            `;
            sommeilTableBody.appendChild(row);
        });
    }

    sommeilTableBody.addEventListener('click', function(e) {
        if (!e.target.classList.contains('btn-delete')) return;
        const idx = parseInt(e.target.getAttribute('data-index'));
        const data = loadData('sommeilData');
        data.splice(idx, 1);
        saveData('sommeilData', data);
        renderTable();
    });

    sommeilForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const entry = {
            date: document.getElementById('date-sommeil').value,
            apnee: parseFloat(document.getElementById('apnee').value) || 0,
            rem: parseFloat(document.getElementById('rem').value) || 0,
            profond: parseFloat(document.getElementById('profond').value) || 0,
            leger: parseFloat(document.getElementById('leger').value) || 0,
            tempsTotal: parseFloat(document.getElementById('temps-total').value) || 0,
            bpm: parseFloat(document.getElementById('bpm').value) || 0,
            oxygen: parseFloat(document.getElementById('oxygen').value) || 0
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
});
