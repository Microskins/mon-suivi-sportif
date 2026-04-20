// ── Records Personnels ───────────────────────────────────────────────────────
// Formats supportés dans les notes de séance :
//   "Squat 4x8 @100kg"   "Squat 4×8@80kg"   "Squat 100kg×5"   "Squat @80kg"

(function () {

    const PR_RE = /([A-Za-zÀ-öø-ÿ][A-Za-zÀ-öø-ÿ\s\-]+?)\s+(?:(\d+)\s*[xX×]\s*(\d+)\s*@\s*(\d+(?:\.\d+)?)\s*kg|(\d+(?:\.\d+)?)\s*kg\s*[xX×]\s*(\d+)|@\s*(\d+(?:\.\d+)?)\s*kg)/gi;

    function parseExercises(text) {
        const results = [];
        PR_RE.lastIndex = 0;
        let m;
        while ((m = PR_RE.exec(text)) !== null) {
            const nom   = m[1].trim();
            const poids = m[4] !== undefined ? parseFloat(m[4])
                        : m[5] !== undefined ? parseFloat(m[5])
                        : parseFloat(m[7]);
            const reps  = m[3] !== undefined ? parseInt(m[3])
                        : m[6] !== undefined ? parseInt(m[6])
                        : 1;
            if (nom && poids > 0) results.push({ nom, poids, reps });
        }
        return results;
    }

    // ── Toast stackable ──────────────────────────────────────────────────────

    let toastContainer = null;

    function getToastContainer() {
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'prToastContainer';
            toastContainer.style.cssText = 'position:fixed;bottom:24px;right:24px;display:flex;flex-direction:column;gap:10px;z-index:10000;pointer-events:none';
            document.body.appendChild(toastContainer);
        }
        return toastContainer;
    }

    window.showPRToast = function (exercice, poids, ancienRecord) {
        const container = getToastContainer();
        const toast = document.createElement('div');
        toast.className = 'pr-toast';
        toast.style.cssText = [
            'background:#26215C',
            'border-left:4px solid #10b981',
            'color:#fff',
            'padding:12px 18px',
            'border-radius:10px',
            'font-size:0.88rem',
            'box-shadow:0 4px 20px rgba(0,0,0,0.35)',
            'opacity:0',
            'transform:translateX(40px)',
            'transition:opacity 0.3s,transform 0.3s',
            'pointer-events:auto',
            'max-width:280px',
        ].join(';');

        const ancien = ancienRecord ? `<span style="opacity:0.65;margin-left:6px;font-size:0.8rem">(avant : ${ancienRecord} kg)</span>` : '';
        toast.innerHTML = `🏆 <strong>PR — ${exercice}</strong> : ${poids} kg${ancien}`;
        container.appendChild(toast);

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                toast.style.opacity = '1';
                toast.style.transform = 'translateX(0)';
            });
        });

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(40px)';
            setTimeout(() => toast.remove(), 350);
        }, 4000);
    };

    // ── Sparkline SVG ────────────────────────────────────────────────────────

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
        const last = pts.split(' ').slice(-1)[0];
        return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="display:block">
            <polyline points="${pts}" fill="none" stroke="var(--primary)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="${last.split(',')[0]}" cy="${last.split(',')[1]}" r="2.5" fill="var(--primary)"/>
        </svg>`;
    }

    // ── Détection et enregistrement des records ──────────────────────────────

    window.checkAndUpdateRecords = function (entry) {
        const records = loadData('records', {});
        const newPRs  = [];

        parseExercises(entry.exercices || '').forEach(({ nom, poids, reps }) => {
            const existingKey = Object.keys(records).find(k => k.toLowerCase() === nom.toLowerCase()) || nom;
            const hist        = records[existingKey] || [];
            const maxPoids    = hist.length > 0 ? Math.max(...hist.map(r => r.poids)) : 0;
            if (poids > maxPoids) {
                records[existingKey] = hist.concat({ date: entry.date, poids, reps, type: entry.type });
                newPRs.push({ nom: existingKey, poids, reps, ancien: maxPoids || null });
            }
        });

        if (newPRs.length > 0) {
            saveData('records', records);
            newPRs.forEach(({ nom, poids, ancien }) =>
                window.showPRToast(nom, poids, ancien > 0 ? ancien : null)
            );
            window.renderDashRecords?.();
        }
    };

    // ── Rendu tableau Records (onglet Séances) ───────────────────────────────

    window.renderRecords = function () {
        const tbody = document.getElementById('recordsList');
        if (!tbody) return;
        const records = loadData('records', {});
        const entries = Object.entries(records).filter(([, h]) => Array.isArray(h) && h.length > 0);

        if (entries.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-3);padding:20px">Aucun record — note tes exercices avec "Squat 4x8 @100kg"</td></tr>';
            return;
        }

        tbody.innerHTML = entries.map(([nom, hist]) => {
            const best = [...hist].sort((a, b) => b.poids - a.poids)[0];
            return `<tr>
                <td><strong>${nom}</strong></td>
                <td><strong>${best.poids} kg</strong></td>
                <td>${best.reps}</td>
                <td>${best.date}</td>
                <td>${sparklineSVG(hist)}</td>
                <td class="actions-cell">
                    <button class="btn-edit btn-edit-record" data-nom="${nom}" title="Modifier">✎</button>
                    <button class="btn-delete btn-delete-record" data-nom="${nom}" title="Supprimer">✕</button>
                </td>
            </tr>`;
        }).join('');
    };

    // ── Rendu Dashboard Records ──────────────────────────────────────────────

    window.renderDashRecords = function () {
        const el = document.getElementById('dashRecordsList');
        if (!el) return;
        const records = loadData('records', {});

        const allPRs = [];
        Object.entries(records).forEach(([nom, hist]) => {
            if (!Array.isArray(hist)) return;
            hist.forEach(r => allPRs.push({ nom, ...r }));
        });

        const recent = allPRs.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

        if (recent.length === 0) {
            el.innerHTML = '<p class="chart-empty">Aucun record enregistré</p>';
            return;
        }

        el.innerHTML = recent.map(r =>
            `<div class="dash-record-item">
                <span class="dri-name">🏆 ${r.nom}</span>
                <span class="dri-val">${r.poids} kg × ${r.reps}</span>
                <span class="dri-date">${r.date}</span>
            </div>`
        ).join('');
    };

    // ── Événements tableau (édition / suppression) ───────────────────────────

    document.addEventListener('DOMContentLoaded', function () {

        // Ajout manuel
        document.getElementById('btnAddRecord')?.addEventListener('click', () => {
            openModal({
                title: 'Ajouter un record',
                fields: [
                    { key: 'nom',   label: 'Exercice',    type: 'text',   placeholder: 'Squat' },
                    { key: 'poids', label: 'Poids (kg)',  type: 'number', min: 0, step: 0.5 },
                    { key: 'reps',  label: 'Répétitions', type: 'number', min: 1 },
                    { key: 'date',  label: 'Date',        type: 'date' },
                ],
                values: { nom: '', poids: 0, reps: 1, date: new Date().toISOString().split('T')[0] },
                onSave: (vals) => {
                    if (!vals.nom.trim() || !vals.poids) return;
                    const records = loadData('records', {});
                    const key = vals.nom.trim();
                    const existing = Object.keys(records).find(k => k.toLowerCase() === key.toLowerCase()) || key;
                    records[existing] = (records[existing] || []).concat({
                        date: vals.date,
                        poids: parseFloat(vals.poids),
                        reps: parseInt(vals.reps) || 1,
                        type: 'manuel'
                    });
                    saveData('records', records);
                    window.renderRecords();
                    window.renderDashRecords();
                    window.dispatchEvent(new CustomEvent('suivi:dataChanged'));
                }
            });
        });

        // Délégation de clics sur le tbody
        document.getElementById('recordsList')?.addEventListener('click', (e) => {
            const editBtn = e.target.closest('.btn-edit-record');
            const delBtn  = e.target.closest('.btn-delete-record');

            if (delBtn) {
                const nom = delBtn.dataset.nom;
                const records = loadData('records', {});
                delete records[nom];
                saveData('records', records);
                window.renderRecords();
                window.renderDashRecords();
                window.dispatchEvent(new CustomEvent('suivi:dataChanged'));
            }

            if (editBtn) {
                const nom = editBtn.dataset.nom;
                const records = loadData('records', {});
                const hist = records[nom] || [];
                const best = [...hist].sort((a, b) => b.poids - a.poids)[0] || {};
                openModal({
                    title: `Modifier : ${nom}`,
                    fields: [
                        { key: 'poids', label: 'Poids (kg)',  type: 'number', min: 0, step: 0.5 },
                        { key: 'reps',  label: 'Répétitions', type: 'number', min: 1 },
                        { key: 'date',  label: 'Date',        type: 'date' },
                    ],
                    values: { poids: best.poids || 0, reps: best.reps || 1, date: best.date || '' },
                    onSave: (vals) => {
                        const fresh = loadData('records', {});
                        const freshHist = fresh[nom] || [];
                        const idx = freshHist.indexOf(freshHist.find(r => r.poids === best.poids && r.date === best.date));
                        const updated = { date: vals.date, poids: parseFloat(vals.poids), reps: parseInt(vals.reps) || 1, type: best.type || 'manuel' };
                        if (idx >= 0) freshHist[idx] = updated; else freshHist.push(updated);
                        fresh[nom] = freshHist;
                        saveData('records', fresh);
                        window.renderRecords();
                        window.renderDashRecords();
                        window.dispatchEvent(new CustomEvent('suivi:dataChanged'));
                    }
                });
            }
        });

        window.renderRecords();
        window.renderDashRecords();
        window.addEventListener('suivi:dataChanged', () => {
            window.renderRecords();
            window.renderDashRecords();
        });
    });

})();
