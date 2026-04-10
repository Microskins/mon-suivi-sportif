document.addEventListener('DOMContentLoaded', function() {
    const sommeilForm = document.getElementById('sommeilForm');
    const sommeilTableBody = document.querySelector('#sommeilTable tbody');

    // Charger et afficher les données de sommeil
    function loadAndDisplaySommeilData() {
        const sommeilData = loadData('sommeilData');
        sommeilTableBody.innerHTML = '';
        sommeilData.forEach(entry => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${entry.date}</td>
                <td>${entry.apnee}</td>
                <td>${entry.rem}</td>
                <td>${entry.profond}</td>
                <td>${entry.leger}</td>
                <td>${entry.tempsTotal}</td>
                <td>${entry.bpm}</td>
                <td>${entry.oxygen}</td>
            `;
            sommeilTableBody.appendChild(row);
        });
    }

    // Enregistrement des données de sommeil
    sommeilForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const sommeilData = {
            date: document.getElementById('date-sommeil').value,
            apnee: parseFloat(document.getElementById('apnee').value),
            rem: parseFloat(document.getElementById('rem').value),
            profond: parseFloat(document.getElementById('profond').value),
            leger: parseFloat(document.getElementById('leger').value),
            tempsTotal: parseFloat(document.getElementById('temps-total').value),
            bpm: parseFloat(document.getElementById('bpm').value),
            oxygen: parseFloat(document.getElementById('oxygen').value)
        };
        const sommeilEntries = loadData('sommeilData');
        sommeilEntries.push(sommeilData);
        saveData('sommeilData', sommeilEntries);
        loadAndDisplaySommeilData();
        alert('Données Sommeil enregistrées !');
        sommeilForm.reset();
    });

    // Charger les données de sommeil au démarrage
    loadAndDisplaySommeilData();
});