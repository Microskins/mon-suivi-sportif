document.addEventListener('DOMContentLoaded', function() {
    const bodyForm = document.getElementById('bodyForm');
    const bodyDataDisplay = document.getElementById('bodyDataDisplay');
    const feedbackEl = document.getElementById('bodyFeedback');
    const historyTable = document.getElementById('bodyHistoryTable');
    const historyBody = document.querySelector('#bodyHistoryTable tbody');

    document.getElementById('date-body').valueAsDate = new Date();

    function calculateAge(birthDate) {
        const birth = new Date(birthDate);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
        return age;
    }

    function imcCategorie(imc) {
        if (imc < 18.5) return 'Insuffisance pondérale';
        if (imc < 25) return 'Poids normal';
        if (imc < 30) return 'Surpoids';
        return 'Obésité';
    }

    function renderDisplay() {
        const settings = window.loadBodySettings();
        if (!settings) { bodyDataDisplay.innerHTML = ''; return; }

        const imc = (settings.poids / Math.pow(settings.taille / 100, 2)).toFixed(1);
        const age = calculateAge(settings.age);
        bodyDataDisplay.innerHTML = `
            <div class="body-stats">
                <div class="stat-card"><span class="stat-val">${settings.poids} kg</span><span class="stat-lbl">Poids</span></div>
                <div class="stat-card"><span class="stat-val">${settings.taille} cm</span><span class="stat-lbl">Taille</span></div>
                <div class="stat-card"><span class="stat-val">${settings.tourTaille} cm</span><span class="stat-lbl">Tour de taille</span></div>
                <div class="stat-card"><span class="stat-val">${age} ans</span><span class="stat-lbl">Âge</span></div>
                <div class="stat-card"><span class="stat-val">${imc}</span><span class="stat-lbl">IMC — ${imcCategorie(parseFloat(imc))}</span></div>
            </div>
        `;
    }

    function renderHistory() {
        const history = loadData('bodyHistory');
        if (history.length === 0) { historyTable.style.display = 'none'; return; }
        historyTable.style.display = '';
        const sorted = [...history].sort((a, b) => b.date.localeCompare(a.date));
        historyBody.innerHTML = '';
        sorted.forEach((entry) => {
            const originalIdx = history.indexOf(entry);
            const settings = window.loadBodySettings();
            const taille = settings ? settings.taille : 175;
            const imc = (entry.poids / Math.pow(taille / 100, 2)).toFixed(1);
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${entry.date}</td>
                <td>${entry.poids}</td>
                <td>${entry.tourTaille || '—'}</td>
                <td>${imc}</td>
                <td class="actions-cell">
                    <button class="btn-edit"   data-index="${originalIdx}" title="Modifier">✎</button>
                    <button class="btn-delete" data-index="${originalIdx}" title="Supprimer">✕</button>
                </td>
            `;
            historyBody.appendChild(row);
        });
    }

    historyBody.addEventListener('click', function(e) {
        const idx = parseInt(e.target.getAttribute('data-index'));
        const history = loadData('bodyHistory');

        if (e.target.classList.contains('btn-delete')) {
            history.splice(idx, 1);
            saveData('bodyHistory', history);
            renderHistory();
        }

        if (e.target.classList.contains('btn-edit')) {
            openModal({
                title: 'Modifier la mesure corporelle',
                fields: [
                    { key: 'date',       label: 'Date',              type: 'date'   },
                    { key: 'poids',      label: 'Poids (kg)',         type: 'number', step: 0.1, min: 0 },
                    { key: 'tourTaille', label: 'Tour de taille (cm)', type: 'number', step: 0.1, min: 0 },
                ],
                values: history[idx],
                onSave: (vals) => {
                    history[idx] = { ...history[idx], date: vals.date, poids: parseFloat(vals.poids) || 0, tourTaille: parseFloat(vals.tourTaille) || 0 };
                    saveData('bodyHistory', history);
                    renderHistory();
                    showFeedback(feedbackEl, 'Mesure modifiée !');
                }
            });
        }
    });

    bodyForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const settings = {
            poids: parseFloat(document.getElementById('poids').value),
            tourTaille: parseFloat(document.getElementById('tour-taille').value) || 0,
            taille: parseFloat(document.getElementById('taille').value),
            age: document.getElementById('age').value
        };

        // Sauvegarder les paramètres courants
        window.saveBodySettings(settings);

        // Ajouter une entrée dans l'historique
        const history = loadData('bodyHistory');
        history.push({
            date: document.getElementById('date-body').value,
            poids: settings.poids,
            tourTaille: settings.tourTaille
        });
        saveData('bodyHistory', history);

        renderDisplay();
        renderHistory();
        showFeedback(feedbackEl, 'Données corporelles enregistrées !');
    });

    // Pré-remplir le formulaire avec les dernières données
    const saved = window.loadBodySettings();
    if (saved) {
        if (saved.poids) document.getElementById('poids').value = saved.poids;
        if (saved.tourTaille) document.getElementById('tour-taille').value = saved.tourTaille;
        if (saved.taille) document.getElementById('taille').value = saved.taille;
        if (saved.age) document.getElementById('age').value = saved.age;
    }

    renderDisplay();
    renderHistory();
    window.addEventListener('suivi:dataChanged', () => { renderDisplay(); renderHistory(); });
});
