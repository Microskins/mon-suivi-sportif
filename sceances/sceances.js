document.addEventListener('DOMContentLoaded', function() {
    const seanceForm = document.getElementById('seanceForm');
    const tableBody  = document.querySelector('#seanceTable tbody');
    const feedbackEl = document.getElementById('seanceFeedback');

    document.getElementById('date-seance').valueAsDate = new Date();

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

        // Détection des records personnels
        if (entry.exercices) checkAndUpdateRecords(entry);

        renderTable();
        renderRecords();
        seanceForm.reset();
        document.getElementById('date-seance').valueAsDate = new Date();
        document.getElementById('ressenti').value = '3';
        window.dispatchEvent(new CustomEvent('suivi:dataChanged'));
        showFeedback(feedbackEl, 'Séance enregistrée !');
    });

    // ── Records Personnels (PR) ──────────────────────────────

    const PR_RE = /([A-Za-zÀ-öø-ÿ][A-Za-zÀ-öø-ÿ\s\-]+?)\s+(?:(\d+)\s*[xX×]\s*(\d+)\s*@\s*(\d+(?:\.\d+)?)\s*kg|(\d+(?:\.\d+)?)\s*kg\s*[xX×]\s*(\d+))/gi;

    function parseExercises(text) {
        const results = [];
        PR_RE.lastIndex = 0;
        let m;
        while ((m = PR_RE.exec(text)) !== null) {
            const nom  = m[1].trim();
            const poids = m[4] !== undefined ? parseFloat(m[4]) : parseFloat(m[5]);
            const reps  = m[3] !== undefined ? parseInt(m[3])   : parseInt(m[6]);
            if (nom && poids > 0 && reps > 0) results.push({ nom, poids, reps });
        }
        return results;
    }

    function checkAndUpdateRecords(entry) {
        const records = loadData('records', {});
        const newPRs  = [];

        parseExercises(entry.exercices || '').forEach(({ nom, poids, reps }) => {
            const existingKey = Object.keys(records).find(k => k.toLowerCase() === nom.toLowerCase()) || nom;
            const hist = records[existingKey] || [];
            const maxPoids = hist.length > 0 ? Math.max(...hist.map(r => r.poids)) : 0;
            if (poids > maxPoids) {
                records[existingKey] = hist.concat({ date: entry.date, poids, reps, type: entry.type });
                newPRs.push({ nom: existingKey, poids, reps });
            }
        });

        if (newPRs.length > 0) {
            saveData('records', records);
            newPRs.forEach(({ nom, poids, reps }) =>
                showRecordToast(`🏆 Nouveau record : ${nom} ${poids} kg × ${reps}`)
            );
        }
    }

    function showRecordToast(message) {
        const toast = document.createElement('div');
        toast.className = 'record-toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        requestAnimationFrame(() => { requestAnimationFrame(() => toast.classList.add('show')); });
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 400);
        }, 4000);
    }

    // ── Section Records dans l'onglet Séances ─────────────────

    function sparklineSVG(history) {
        if (!history || history.length < 2) return '';
        const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
        const vals   = sorted.map(r => r.poids);
        const min    = Math.min(...vals);
        const max    = Math.max(...vals);
        const range  = max - min || 1;
        const W = 64, H = 24, pad = 2;
        const pts = vals.map((v, i) => {
            const x = pad + (i / (vals.length - 1)) * (W - pad * 2);
            const y = H - pad - ((v - min) / range) * (H - pad * 2);
            return `${x.toFixed(1)},${y.toFixed(1)}`;
        }).join(' ');
        return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="display:block">
            <polyline points="${pts}" fill="none" stroke="var(--primary)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="${pts.split(' ').slice(-1)[0].split(',')[0]}" cy="${pts.split(' ').slice(-1)[0].split(',')[1]}" r="2.5" fill="var(--primary)"/>
        </svg>`;
    }

    function renderRecords() {
        const tbody = document.getElementById('recordsTableBody');
        if (!tbody) return;
        const records = loadData('records', {});
        const entries = Object.entries(records).filter(([, h]) => Array.isArray(h) && h.length > 0);
        if (entries.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-3);padding:20px">Aucun record — note tes exercices avec "Squat 4x8 @100kg"</td></tr>';
            return;
        }
        tbody.innerHTML = entries.map(([nom, hist]) => {
            const sorted = [...hist].sort((a, b) => b.poids - a.poids);
            const best   = sorted[0];
            return `<tr>
                <td><strong>${nom}</strong></td>
                <td><strong>${best.poids} kg</strong></td>
                <td>${best.reps}</td>
                <td>${best.date}</td>
                <td>${sparklineSVG(hist)}</td>
                <td class="actions-cell">
                    <button class="btn-delete-record" data-nom="${nom}" title="Supprimer">✕</button>
                </td>
            </tr>`;
        }).join('');
    }

    // Ajout manuel d'un record
    document.getElementById('btnAddRecord')?.addEventListener('click', () => {
        openModal({
            title: 'Ajouter un record',
            fields: [
                { key: 'nom',   label: 'Exercice',   type: 'text',   placeholder: 'Squat' },
                { key: 'poids', label: 'Poids (kg)', type: 'number', min: 0, step: 0.5 },
                { key: 'reps',  label: 'Répétitions', type: 'number', min: 1 },
                { key: 'date',  label: 'Date',        type: 'date' },
            ],
            values: { nom: '', poids: 0, reps: 1, date: new Date().toISOString().split('T')[0] },
            onSave: (vals) => {
                if (!vals.nom.trim() || !vals.poids) return;
                const records = loadData('records', {});
                const key = vals.nom.trim();
                const existing = Object.keys(records).find(k => k.toLowerCase() === key.toLowerCase()) || key;
                records[existing] = (records[existing] || []).concat({ date: vals.date, poids: vals.poids, reps: vals.reps, type: 'manuel' });
                saveData('records', records);
                renderRecords();
                window.dispatchEvent(new CustomEvent('suivi:dataChanged'));
            }
        });
    });

    // Suppression d'un record
    document.getElementById('recordsTableBody')?.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-delete-record');
        if (!btn) return;
        const nom = btn.dataset.nom;
        const records = loadData('records', {});
        delete records[nom];
        saveData('records', records);
        renderRecords();
        window.dispatchEvent(new CustomEvent('suivi:dataChanged'));
    });

    renderTable();
    renderRecords();
    window.addEventListener('suivi:dataChanged', () => { renderTable(); renderRecords(); });
});
