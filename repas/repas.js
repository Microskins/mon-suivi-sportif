document.addEventListener('DOMContentLoaded', function() {
    const repasForm = document.getElementById('repasForm');
    const tableBody = document.querySelector('#repasTable tbody');
    const feedbackEl = document.getElementById('repasFeedback');
    const totauxBar = document.getElementById('repasTotaux');

    // Date du jour par défaut
    document.getElementById('date-repas').valueAsDate = new Date();

    function typeLabel(type) {
        const labels = {
            'petit-dejeuner': 'Petit-déjeuner',
            'dejeuner': 'Déjeuner',
            'diner': 'Dîner',
            'collation': 'Collation'
        };
        return labels[type] || type;
    }

    function updateTotaux(data) {
        if (data.length === 0) { totauxBar.style.display = 'none'; return; }
        const totalKcal = data.reduce((s, r) => s + (r.calories || 0), 0);
        const totalProt = data.reduce((s, r) => s + (r.proteines || 0), 0);
        const totalGluc = data.reduce((s, r) => s + (r.glucides || 0), 0);
        const totalLip  = data.reduce((s, r) => s + (r.lipides || 0), 0);
        document.getElementById('totalKcal').textContent = `${totalKcal} kcal`;
        document.getElementById('totalProt').textContent = `${totalProt} g prot.`;
        document.getElementById('totalGluc').textContent = `${totalGluc} g gluc.`;
        document.getElementById('totalLip').textContent  = `${totalLip} g lip.`;
        totauxBar.style.display = 'flex';
    }

    function renderTable() {
        const data = loadData('repasData');
        const sorted = [...data].sort((a, b) => b.date.localeCompare(a.date));
        tableBody.innerHTML = '';
        sorted.forEach((entry) => {
            const originalIdx = data.findIndex(e => e === entry || (e.date === entry.date && e.type === entry.type && e.calories === entry.calories));
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${entry.date}</td>
                <td>${typeLabel(entry.type)}</td>
                <td>${entry.aliments || '—'}</td>
                <td>${entry.calories || 0}</td>
                <td>${entry.proteines || 0}</td>
                <td>${entry.glucides || 0}</td>
                <td>${entry.lipides || 0}</td>
                <td><button class="btn-delete" data-index="${originalIdx}" title="Supprimer">✕</button></td>
            `;
            tableBody.appendChild(row);
        });
        updateTotaux(data);
    }

    tableBody.addEventListener('click', function(e) {
        if (!e.target.classList.contains('btn-delete')) return;
        const idx = parseInt(e.target.getAttribute('data-index'));
        const data = loadData('repasData');
        data.splice(idx, 1);
        saveData('repasData', data);
        renderTable();
    });

    repasForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const entry = {
            date: document.getElementById('date-repas').value,
            type: document.getElementById('type-repas').value,
            aliments: document.getElementById('aliments').value.trim(),
            calories: parseFloat(document.getElementById('calories').value) || 0,
            proteines: parseFloat(document.getElementById('proteines').value) || 0,
            glucides: parseFloat(document.getElementById('glucides').value) || 0,
            lipides: parseFloat(document.getElementById('lipides').value) || 0
        };
        const data = loadData('repasData');
        data.push(entry);
        saveData('repasData', data);
        renderTable();
        repasForm.reset();
        document.getElementById('date-repas').valueAsDate = new Date();
        showFeedback(feedbackEl, 'Repas enregistré !');
    });

    renderTable();
});
