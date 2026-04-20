document.addEventListener('DOMContentLoaded', function () {

    const TYPES = {
        poids:       { label: 'Poids',           unite: 'kg',        icone: '⚖️' },
        sommeil:     { label: 'Sommeil moyen',    unite: 'h/nuit',    icone: '😴' },
        seances:     { label: 'Séances/semaine',  unite: 'séances',   icone: '🏋️' },
        calories:    { label: 'Calories/jour',    unite: 'kcal',      icone: '🥗' },
        mensuration: { label: 'Mensuration',      unite: 'cm',        icone: '📏' },
        libre:       { label: 'Libre',            unite: '',          icone: '🎯' },
    };

    const COULEURS = ['#6366f1','#10b981','#f97316','#ef4444','#3b82f6','#8b5cf6','#ec4899','#14b8a6'];

    // ── Calcul de la valeur actuelle selon le type ───────────

    function computeValeurActuelle(obj) {
        const MEAL_KEYS = ['petitDejeuner', 'dejeuner', 'collation', 'diner'];
        switch (obj.type) {
            case 'poids': {
                const hist = JSON.parse(localStorage.getItem('bodyHistory') || '[]');
                if (!hist.length) return obj.valeurActuelle;
                return [...hist].sort((a, b) => b.date.localeCompare(a.date))[0].poids;
            }
            case 'sommeil': {
                const data = JSON.parse(localStorage.getItem('sommeilData') || '[]');
                if (!data.length) return obj.valeurActuelle;
                const avg = data.reduce((s, e) => s + (e.tempsTotal || (e.profond||0)+(e.rem||0)+(e.leger||0)), 0) / data.length;
                return Math.round(avg / 60 * 10) / 10;
            }
            case 'seances': {
                const data = JSON.parse(localStorage.getItem('seanceData') || '[]');
                const cutoff = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
                return data.filter(e => e.date >= cutoff).length;
            }
            case 'calories': {
                const data = JSON.parse(localStorage.getItem('repasData') || '[]');
                if (!data.length) return obj.valeurActuelle;
                const avg = data.reduce((s, jour) =>
                    s + MEAL_KEYS.reduce((a, k) => a + (jour[k]?.calories || 0), 0), 0
                ) / data.length;
                return Math.round(avg);
            }
            case 'mensuration': {
                const data = JSON.parse(localStorage.getItem('mensurationsData') || '[]');
                if (!data.length || !obj.champMensuration) return obj.valeurActuelle;
                const sorted = [...data].sort((a, b) => b.date.localeCompare(a.date));
                return sorted[0][obj.champMensuration] || obj.valeurActuelle;
            }
            default:
                return obj.valeurActuelle;
        }
    }

    function syncObjectifs() {
        const objectifs = loadData('objectifs', []);
        let changed = false;
        objectifs.forEach(o => {
            if (!o.actif) return;
            const newVal = computeValeurActuelle(o);
            if (newVal !== o.valeurActuelle) { o.valeurActuelle = newVal; changed = true; }
            // Vérification atteint
            const atteint = o.type === 'poids' || o.type === 'mensuration'
                ? (o.valeurCible > 0 ? o.valeurActuelle <= o.valeurCible : o.valeurActuelle >= Math.abs(o.valeurCible))
                : o.valeurActuelle >= o.valeurCible;
            if (atteint !== o.atteint) { o.atteint = atteint; changed = true; }
        });
        if (changed) saveData('objectifs', objectifs);
        return objectifs;
    }

    // ── Rendu des cards objectifs ────────────────────────────

    function renderObjectifs() {
        const container = document.getElementById('objectifsGrid');
        if (!container) return;
        const objectifs = syncObjectifs();

        if (objectifs.length === 0) {
            container.innerHTML = `<div class="obj-empty">
                <div style="font-size:2.5rem;margin-bottom:12px">🎯</div>
                <p>Aucun objectif défini</p>
                <p style="font-size:0.85rem;color:var(--text-3)">Clique sur "+ Nouvel objectif" pour commencer</p>
            </div>`;
            return;
        }

        container.innerHTML = objectifs.map((o, i) => {
            const pct = o.valeurCible > 0
                ? Math.min(100, Math.round((o.valeurActuelle / o.valeurCible) * 100))
                : 0;
            const jours = o.dateFin
                ? Math.max(0, Math.ceil((new Date(o.dateFin) - new Date()) / 86400000))
                : null;
            const atteintClass = o.atteint ? ' obj-card--done' : '';
            return `<div class="obj-card${atteintClass}" data-index="${i}">
                <div class="obj-card-header">
                    <span class="obj-card-icon">${o.icone || TYPES[o.type]?.icone || '🎯'}</span>
                    <div class="obj-card-title-wrap">
                        <div class="obj-card-title">${o.titre}</div>
                        <div class="obj-card-type">${TYPES[o.type]?.label || o.type}</div>
                    </div>
                    <div class="obj-card-actions">
                        <button class="btn-edit-obj" data-index="${i}" title="Modifier">✎</button>
                        <button class="btn-delete-obj" data-index="${i}" title="Supprimer">✕</button>
                    </div>
                </div>
                ${o.atteint ? '<div class="obj-badge-done">✓ Atteint !</div>' : ''}
                <div class="obj-progress-wrap">
                    <div class="obj-bar-bg">
                        <div class="obj-bar-fill" style="width:${pct}%;background:${o.couleur || 'var(--primary)'}"></div>
                    </div>
                    <div class="obj-progress-meta">
                        <span>${o.valeurActuelle} / ${o.valeurCible} ${o.unite}</span>
                        <span>${pct}%</span>
                    </div>
                </div>
                ${jours !== null ? `<div class="obj-deadline">⏱ J-${jours}${jours === 0 ? ' · Aujourd\'hui !' : ''}</div>` : ''}
                ${o.type === 'libre' ? `<button class="btn-update-prog" data-index="${i}">Mettre à jour</button>` : ''}
            </div>`;
        }).join('');
    }

    // ── Modale nouveau/modifier objectif ────────────────────

    function openObjectifModal(existing = null, idx = null) {
        const isEdit = idx !== null;
        openModal({
            title: isEdit ? 'Modifier l\'objectif' : 'Nouvel objectif',
            fields: [
                { key: 'titre',       label: 'Titre',                type: 'text',   placeholder: 'Ex: Atteindre 80 kg' },
                { key: 'type',        label: 'Type',                 type: 'select', options: Object.entries(TYPES).map(([k, v]) => [k, `${v.icone} ${v.label}`]) },
                { key: 'valeurCible', label: 'Valeur cible',         type: 'number', step: 0.1, min: 0 },
                { key: 'unite',       label: 'Unité (si libre)',      type: 'text',   placeholder: 'kg, reps, km…' },
                { key: 'icone',       label: 'Icône (emoji)',         type: 'text',   placeholder: '🎯' },
                { key: 'couleur',     label: 'Couleur',              type: 'select', options: COULEURS.map(c => [c, c]) },
                { key: 'dateFin',     label: 'Date limite (optionnel)', type: 'date' },
            ],
            values: existing || {
                titre: '', type: 'poids', valeurCible: 0, unite: '',
                icone: '🎯', couleur: COULEURS[0], dateFin: ''
            },
            onSave: (vals) => {
                const objectifs = loadData('objectifs', []);
                const typeInfo  = TYPES[vals.type] || {};
                const obj = {
                    id:             isEdit ? existing.id : 'obj_' + Date.now(),
                    titre:          vals.titre.trim() || 'Objectif',
                    type:           vals.type,
                    valeurCible:    parseFloat(vals.valeurCible) || 0,
                    valeurActuelle: isEdit ? existing.valeurActuelle : 0,
                    unite:          vals.unite.trim() || typeInfo.unite || '',
                    icone:          vals.icone.trim() || typeInfo.icone || '🎯',
                    couleur:        vals.couleur || COULEURS[0],
                    dateFin:        vals.dateFin || null,
                    actif:          true,
                    atteint:        false,
                };
                // Calculer valeur actuelle initiale
                obj.valeurActuelle = computeValeurActuelle(obj);

                if (isEdit) { objectifs[idx] = obj; }
                else        { objectifs.push(obj); }

                saveData('objectifs', objectifs);
                renderObjectifs();
                window.dispatchEvent(new CustomEvent('suivi:dataChanged'));
            }
        });
    }

    // ── Événements ───────────────────────────────────────────

    document.getElementById('btnNouvelObjectif')?.addEventListener('click', () => openObjectifModal());

    document.getElementById('objectifsGrid')?.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.btn-edit-obj');
        const delBtn  = e.target.closest('.btn-delete-obj');
        const updBtn  = e.target.closest('.btn-update-prog');

        if (editBtn) {
            const i = parseInt(editBtn.dataset.index);
            const objectifs = loadData('objectifs', []);
            openObjectifModal(objectifs[i], i);
        }

        if (delBtn) {
            const i = parseInt(delBtn.dataset.index);
            const objectifs = loadData('objectifs', []);
            objectifs.splice(i, 1);
            saveData('objectifs', objectifs);
            renderObjectifs();
            window.dispatchEvent(new CustomEvent('suivi:dataChanged'));
        }

        if (updBtn) {
            const i = parseInt(updBtn.dataset.index);
            const objectifs = loadData('objectifs', []);
            const o = objectifs[i];
            openModal({
                title: `Mettre à jour : ${o.titre}`,
                fields: [{ key: 'valeur', label: `Valeur actuelle (${o.unite})`, type: 'number', step: 0.1, min: 0 }],
                values: { valeur: o.valeurActuelle },
                onSave: (vals) => {
                    const fresh = loadData('objectifs', []);
                    fresh[i].valeurActuelle = parseFloat(vals.valeur) || 0;
                    fresh[i].atteint = fresh[i].valeurActuelle >= fresh[i].valeurCible;
                    saveData('objectifs', fresh);
                    renderObjectifs();
                    window.dispatchEvent(new CustomEvent('suivi:dataChanged'));
                }
            });
        }
    });

    renderObjectifs();
    window.addEventListener('suivi:dataChanged', renderObjectifs);
});
