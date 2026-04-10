document.addEventListener('DOMContentLoaded', function() {
    const seanceForm = document.getElementById('seanceForm');
    const tableBody = document.querySelector('#seanceTable tbody');
    const feedbackEl = document.getElementById('seanceFeedback');

    document.getElementById('date-seance').valueAsDate = new Date();

    const typeLabels = {
        'musculation': 'Musculation',
        'cardio': 'Cardio',
        'hiit': 'HIIT',
        'yoga': 'Yoga / Stretching',
        'sport-co': 'Sport collectif',
        'autre': 'Autre'
    };

    const ressentiLabels = { 1: '★☆☆☆☆', 2: '★★☆☆☆', 3: '★★★☆☆', 4: '★★★★☆', 5: '★★★★★' };

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
                <td>${entry.duree || '—'}</td>
                <td>${entry.kcal || '—'}</td>
                <td title="${entry.ressenti}/5">${ressentiLabels[entry.ressenti] || entry.ressenti}</td>
                <td class="notes-cell">${entry.exercices || '—'}</td>
                <td><button class="btn-delete" data-index="${originalIdx}" title="Supprimer">✕</button></td>
            `;
            tableBody.appendChild(row);
        });
    }

    tableBody.addEventListener('click', function(e) {
        if (!e.target.classList.contains('btn-delete')) return;
        const idx = parseInt(e.target.getAttribute('data-index'));
        const data = loadData('seanceData');
        data.splice(idx, 1);
        saveData('seanceData', data);
        renderTable();
    });

    seanceForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const entry = {
            date: document.getElementById('date-seance').value,
            type: document.getElementById('type-seance').value,
            duree: parseFloat(document.getElementById('duree').value) || 0,
            kcal: parseFloat(document.getElementById('kcal').value) || 0,
            ressenti: parseInt(document.getElementById('ressenti').value),
            exercices: document.getElementById('exercices').value.trim()
        };
        const data = loadData('seanceData');
        data.push(entry);
        saveData('seanceData', data);
        renderTable();
        seanceForm.reset();
        document.getElementById('date-seance').valueAsDate = new Date();
        document.getElementById('ressenti').value = '3';
        showFeedback(feedbackEl, 'Séance enregistrée !');
    });

    renderTable();
});
