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

        const imc  = (settings.poids / Math.pow(settings.taille / 100, 2)).toFixed(1);
        const age  = calculateAge(settings.age);
        const bmr  = Math.round(10 * settings.poids + 6.25 * settings.taille - 5 * age - 78);

        // RTH = tailleMens / hanches (dernière mensuration)
        let rthCard = '';
        const mensData = loadData('mensurationsData');
        if (mensData.length > 0) {
            const last = [...mensData].sort((a, b) => b.date.localeCompare(a.date))[0];
            if (last.tailleMens && last.hanches) {
                const rthVal = last.tailleMens / last.hanches;
                const rth = rthVal.toFixed(2);

                // Seuils selon le sexe du profil courant
                const profiles = JSON.parse(localStorage.getItem('profiles') || '[]');
                const currentId = localStorage.getItem('currentProfileId');
                const profile = profiles.find(p => p.id === currentId);
                const sexe = profile?.sexe || 'homme';
                const seuil = sexe === 'femme' ? 0.85 : 0.90;

                let rthClass, rthLabel;
                if (rthVal <= seuil) {
                    rthClass = 'rth-ok';
                    rthLabel = 'Normal';
                } else if (rthVal <= seuil + 0.09) {
                    rthClass = 'rth-warn';
                    rthLabel = 'Légèrement élevé';
                } else {
                    rthClass = 'rth-danger';
                    rthLabel = 'Élevé';
                }

                rthCard = `<div class="stat-card ${rthClass}"><span class="stat-val">${rth}</span><span class="stat-lbl">RTH — ${rthLabel}</span></div>`;
            }
        }

        bodyDataDisplay.innerHTML = `
            <div class="body-stats${rthCard ? ' has-rth' : ''}">
                <div class="stat-card"><span class="stat-val">${settings.poids} kg</span><span class="stat-lbl">Poids</span></div>
                <div class="stat-card"><span class="stat-val">${settings.taille} cm</span><span class="stat-lbl">Taille</span></div>
                <div class="stat-card"><span class="stat-val">${age} ans</span><span class="stat-lbl">Âge</span></div>
                <div class="stat-card"><span class="stat-val">${imc}</span><span class="stat-lbl">IMC — ${imcCategorie(parseFloat(imc))}</span></div>
                <div class="stat-card"><span class="stat-val">${bmr} kcal</span><span class="stat-lbl">Métabolisme de base</span></div>
                ${rthCard}
            </div>
        `;
    }

    function renderHistory() {
        const history = loadData('bodyHistory');
        const wrap = document.getElementById('bodyHistoryTableWrap');
        if (history.length === 0) { if (wrap) wrap.style.display = 'none'; return; }
        if (wrap) wrap.style.display = '';
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
                ],
                values: history[idx],
                onSave: (vals) => {
                    history[idx] = { ...history[idx], date: vals.date, poids: parseFloat(vals.poids) || 0 };
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
            taille: parseFloat(document.getElementById('taille').value),
            age: document.getElementById('age').value,
        };

        // Sauvegarder les paramètres courants
        window.saveBodySettings(settings);

        // Ajouter une entrée dans l'historique
        const history = loadData('bodyHistory');
        history.push({
            date: document.getElementById('date-body').value,
            poids: settings.poids
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
        if (saved.taille) document.getElementById('taille').value = saved.taille;
        if (saved.age) document.getElementById('age').value = saved.age;
        if (saved.graisseViscerale) document.getElementById('graisse-viscerale').value = saved.graisseViscerale;
    }

    renderDisplay();
    renderHistory();

    // ── Mensurations ──────────────────────────────────────────────────────────

    const mensFeedback = document.getElementById('mensurationFeedback');

    document.getElementById('date-mensuration').valueAsDate = new Date();

    function getMensValues() {
        return {
            date:      document.getElementById('date-mensuration').value,
            epaules:   parseFloat(document.getElementById('m-epaules').value)   || null,
            cou:       parseFloat(document.getElementById('m-cou').value)        || null,
            poitrine:  parseFloat(document.getElementById('m-poitrine').value)   || null,
            tailleMens:parseFloat(document.getElementById('m-taille-m').value)   || null,
            hanches:   parseFloat(document.getElementById('m-hanches').value)    || null,
            biceps:    parseFloat(document.getElementById('m-biceps').value)     || null,
            avantbras: parseFloat(document.getElementById('m-avantbras').value)  || null,
            cuisses:   parseFloat(document.getElementById('m-cuisses').value)    || null,
            mollets:   parseFloat(document.getElementById('m-mollets').value)    || null,
        };
    }

    function fillMensForm(entry) {
        if (!entry) return;
        const set = (id, val) => { if (val !== null && val !== undefined) document.getElementById(id).value = val; };
        set('date-mensuration', entry.date);
        set('m-epaules',   entry.epaules);
        set('m-cou',       entry.cou);
        set('m-poitrine',  entry.poitrine);
        set('m-taille-m',  entry.tailleMens);
        set('m-hanches',   entry.hanches);
        set('m-biceps',    entry.biceps);
        set('m-avantbras', entry.avantbras);
        set('m-cuisses',   entry.cuisses);
        set('m-mollets',   entry.mollets);
    }

    function renderMensurations() {
        const data = loadData('mensurationsData');
        if (data.length > 0) {
            const last = [...data].sort((a, b) => b.date.localeCompare(a.date))[0];
            fillMensForm(last);
        }
    }

    function renderMensurationsTable() {
        const data = loadData('mensurationsData');
        const wrap = document.getElementById('mensurationsHistoryWrap');
        const tbody = document.querySelector('#mensurationsHistoryTable tbody');
        if (!data.length) { wrap.style.display = 'none'; return; }
        wrap.style.display = '';
        const sorted = [...data].sort((a, b) => b.date.localeCompare(a.date));
        tbody.innerHTML = '';
        sorted.forEach((e) => {
            const orig = data.indexOf(e);
            const v = val => val != null ? val : '—';
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${e.date}</td>
                <td>${v(e.epaules)}</td>
                <td>${v(e.cou)}</td>
                <td>${v(e.poitrine)}</td>
                <td>${v(e.tailleMens)}</td>
                <td>${v(e.hanches)}</td>
                <td>${v(e.biceps)}</td>
                <td>${v(e.avantbras)}</td>
                <td>${v(e.cuisses)}</td>
                <td>${v(e.mollets)}</td>
                <td class="actions-cell">
                    <button class="btn-edit"   data-index="${orig}" title="Modifier">✎</button>
                    <button class="btn-delete" data-index="${orig}" title="Supprimer">✕</button>
                </td>`;
            tbody.appendChild(row);
        });
    }

    document.querySelector('#mensurationsHistoryTable tbody').addEventListener('click', e => {
        const idx = parseInt(e.target.getAttribute('data-index'));
        const data = loadData('mensurationsData');

        if (e.target.classList.contains('btn-delete')) {
            data.splice(idx, 1);
            saveData('mensurationsData', data);
            renderMensurationsTable();
        }

        if (e.target.classList.contains('btn-edit')) {
            openModal({
                title: 'Modifier les mensurations',
                fields: [
                    { key: 'date',      label: 'Date',         type: 'date'   },
                    { key: 'epaules',   label: 'Épaules (cm)', type: 'number', step: 0.1, min: 0 },
                    { key: 'cou',       label: 'Cou (cm)',     type: 'number', step: 0.1, min: 0 },
                    { key: 'poitrine',  label: 'Poitrine (cm)',type: 'number', step: 0.1, min: 0 },
                    { key: 'tailleMens',label: 'Tour de taille (cm)', type: 'number', step: 0.1, min: 0 },
                    { key: 'hanches',   label: 'Hanches (cm)', type: 'number', step: 0.1, min: 0 },
                    { key: 'biceps',    label: 'Biceps (cm)',  type: 'number', step: 0.1, min: 0 },
                    { key: 'avantbras', label: 'Avant-bras (cm)', type: 'number', step: 0.1, min: 0 },
                    { key: 'cuisses',   label: 'Cuisses (cm)', type: 'number', step: 0.1, min: 0 },
                    { key: 'mollets',   label: 'Mollets (cm)', type: 'number', step: 0.1, min: 0 },
                ],
                values: data[idx],
                onSave: (vals) => {
                    data[idx] = {
                        date:       vals.date,
                        epaules:    parseFloat(vals.epaules)    || null,
                        cou:        parseFloat(vals.cou)        || null,
                        poitrine:   parseFloat(vals.poitrine)   || null,
                        tailleMens: parseFloat(vals.tailleMens) || null,
                        hanches:    parseFloat(vals.hanches)    || null,
                        biceps:     parseFloat(vals.biceps)     || null,
                        avantbras:  parseFloat(vals.avantbras)  || null,
                        cuisses:    parseFloat(vals.cuisses)    || null,
                        mollets:    parseFloat(vals.mollets)    || null,
                    };
                    saveData('mensurationsData', data);
                    renderMensurationsTable();
                    renderDisplay();
                    showFeedback(mensFeedback, 'Mensurations modifiées !');
                }
            });
        }
    });

    document.getElementById('saveMensurations').addEventListener('click', () => {
        const entry = getMensValues();
        if (!entry.date) { showFeedback(mensFeedback, 'Sélectionne une date', 'error'); return; }
        const data = loadData('mensurationsData');
        const idx = data.findIndex(d => d.date === entry.date);
        if (idx >= 0) data[idx] = entry; else data.push(entry);
        saveData('mensurationsData', data);
        renderMensurationsTable();
        renderDisplay();
        showFeedback(mensFeedback, 'Mensurations enregistrées !');
    });

    renderMensurations();
    renderMensurationsTable();
    window.addEventListener('suivi:dataChanged', () => { renderDisplay(); renderHistory(); renderMensurations(); renderMensurationsTable(); });
});
