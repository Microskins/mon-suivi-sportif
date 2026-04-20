document.addEventListener('DOMContentLoaded', function () {

    const TYPES = {
        poids:       { label: 'Poids',           unite: 'kg',        icone: '⚖️',  dir: 'min' },
        sommeil:     { label: 'Sommeil moyen',    unite: 'h/nuit',    icone: '😴',  dir: 'max' },
        seances:     { label: 'Séances/semaine',  unite: 'séances',   icone: '🏋️', dir: 'max' },
        calories:    { label: 'Calories/jour',    unite: 'kcal',      icone: '🥗',  dir: 'max' },
        mensuration: { label: 'Mensuration',      unite: 'cm',        icone: '📏',  dir: 'min' },
        libre:       { label: 'Libre',            unite: '',          icone: '🎯',  dir: 'max' },
    };

    const MENS_CHAMPS = [
        ['epaules','Épaules'], ['cou','Cou'], ['poitrine','Poitrine'],
        ['tailleMens','Tour de taille'], ['hanches','Hanches'],
        ['biceps','Biceps'], ['avantbras','Avant-bras'],
        ['cuisses','Cuisses'], ['mollets','Mollets'],
    ];

    const COULEURS = ['#6366f1','#10b981','#f97316','#ef4444','#3b82f6','#8b5cf6','#ec4899','#14b8a6'];

    // ── Calcul de la valeur actuelle selon le type ───────────────────────────

    function computeValeurActuelle(obj) {
        const MEAL_KEYS = ['petitDejeuner', 'dejeuner', 'collation', 'diner'];
        switch (obj.type) {
            case 'poids': {
                const hist = loadData('bodyHistory', []);
                if (!hist.length) return obj.valeurActuelle;
                return [...hist].sort((a, b) => b.date.localeCompare(a.date))[0].poids;
            }
            case 'sommeil': {
                const data = loadData('sommeilData', []);
                if (!data.length) return obj.valeurActuelle;
                const avg = data.reduce((s, e) => s + (e.tempsTotal || (e.profond||0)+(e.rem||0)+(e.leger||0)), 0) / data.length;
                return Math.round(avg / 60 * 10) / 10;
            }
            case 'seances': {
                const data = loadData('seanceData', []);
                const cutoff = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
                return data.filter(e => e.date >= cutoff).length;
            }
            case 'calories': {
                const data = loadData('repasData', []);
                if (!data.length) return obj.valeurActuelle;
                const avg = data.reduce((s, jour) =>
                    s + MEAL_KEYS.reduce((a, k) => a + (jour[k]?.calories || 0), 0), 0
                ) / data.length;
                return Math.round(avg);
            }
            case 'mensuration': {
                const data = loadData('mensurationsData', []);
                const champ = obj.sousType || obj.champMensuration;
                if (!data.length || !champ) return obj.valeurActuelle;
                const sorted = [...data].sort((a, b) => b.date.localeCompare(a.date));
                return sorted[0][champ] || obj.valeurActuelle;
            }
            default:
                return obj.valeurActuelle;
        }
    }

    // ── Calcul du pourcentage de progression ─────────────────────────────────

    function computePct(o) {
        const dir = o.direction || TYPES[o.type]?.dir || 'max';
        if (dir === 'min') {
            const depart = o.valeurDepart ?? o.valeurActuelle;
            const range  = depart - o.valeurCible;
            if (!range) return o.valeurActuelle <= o.valeurCible ? 100 : 0;
            return Math.max(0, Math.min(100, Math.round(((depart - o.valeurActuelle) / range) * 100)));
        }
        if (!o.valeurCible) return 0;
        return Math.min(100, Math.round((o.valeurActuelle / o.valeurCible) * 100));
    }

    // ── Vérification atteint ──────────────────────────────────────────────────

    function computeAtteint(o) {
        const dir = o.direction || TYPES[o.type]?.dir || 'max';
        return dir === 'min'
            ? o.valeurActuelle <= o.valeurCible
            : o.valeurActuelle >= o.valeurCible;
    }

    // ── Sync valeurs actuelles ────────────────────────────────────────────────

    function syncObjectifs() {
        const objectifs = loadData('objectifs', []);
        let changed = false;
        objectifs.forEach(o => {
            if (!o.actif) return;
            const newVal = computeValeurActuelle(o);
            if (newVal !== o.valeurActuelle) { o.valeurActuelle = newVal; changed = true; }
            const atteint = computeAtteint(o);
            if (atteint !== o.atteint) { o.atteint = atteint; changed = true; }
        });
        if (changed) saveData('objectifs', objectifs);
        return objectifs;
    }

    // ── Rendu des cards objectifs ─────────────────────────────────────────────

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
            const pct   = computePct(o);
            const jours = o.dateFin
                ? Math.max(0, Math.ceil((new Date(o.dateFin) - new Date()) / 86400000))
                : null;
            const joursDebut = o.dateDebut
                ? Math.max(0, Math.ceil((new Date() - new Date(o.dateDebut)) / 86400000))
                : null;
            const dir = o.direction || TYPES[o.type]?.dir || 'max';
            const dirLabel = dir === 'min' ? '↓' : '↑';
            const atteintClass = o.atteint ? ' obj-card--done' : '';
            const sousTypeLabel = o.sousType ? ` · ${MENS_CHAMPS.find(([k]) => k === o.sousType)?.[1] || o.sousType}` : '';

            return `<div class="obj-card${atteintClass}" data-index="${i}">
                <div class="obj-card-header">
                    <span class="obj-card-icon">${o.icone || TYPES[o.type]?.icone || '🎯'}</span>
                    <div class="obj-card-title-wrap">
                        <div class="obj-card-title">${o.titre}</div>
                        <div class="obj-card-type">${TYPES[o.type]?.label || o.type}${sousTypeLabel} <span class="obj-dir-badge">${dirLabel}</span></div>
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
                <div class="obj-dates-row">
                    ${joursDebut !== null ? `<span>J+${joursDebut}</span>` : ''}
                    ${jours !== null ? `<span class="obj-deadline">⏱ J-${jours}${jours === 0 ? ' · Aujourd\'hui !' : ''}</span>` : ''}
                </div>
                ${o.type === 'libre' ? `<button class="btn-update-prog" data-index="${i}">Mettre à jour</button>` : ''}
            </div>`;
        }).join('');
    }

    // ── Modale nouveau/modifier objectif ─────────────────────────────────────

    function openObjectifModal(existing = null, idx = null) {
        const isEdit = idx !== null;
        const today  = new Date().toISOString().split('T')[0];
        openModal({
            title: isEdit ? 'Modifier l\'objectif' : 'Nouvel objectif',
            fields: [
                { key: 'titre',      label: 'Titre',                        type: 'text',   placeholder: 'Ex: Atteindre 80 kg' },
                { key: 'type',       label: 'Type',                         type: 'select', options: Object.entries(TYPES).map(([k, v]) => [k, `${v.icone} ${v.label}`]) },
                { key: 'sousType',   label: 'Mensuration (si type=mensuration)', type: 'select', options: [['','— Choisir —'], ...MENS_CHAMPS] },
                { key: 'direction',  label: 'Direction',                    type: 'select', options: [['max','↑ Augmenter / Atteindre'],['min','↓ Diminuer / Réduire']] },
                { key: 'valeurCible',label: 'Valeur cible',                 type: 'number', step: 0.1, min: 0 },
                { key: 'unite',      label: 'Unité (si libre)',              type: 'text',   placeholder: 'kg, reps, km…' },
                { key: 'icone',      label: 'Icône (emoji)',                 type: 'text',   placeholder: '🎯' },
                { key: 'couleur',    label: 'Couleur',                      type: 'select', options: COULEURS.map(c => [c, c]) },
                { key: 'dateDebut',  label: 'Date début (optionnel)',        type: 'date' },
                { key: 'dateFin',    label: 'Date limite (optionnel)',       type: 'date' },
            ],
            values: existing || {
                titre: '', type: 'poids', sousType: '', direction: 'min',
                valeurCible: 0, unite: '', icone: '🎯',
                couleur: COULEURS[0], dateDebut: today, dateFin: ''
            },
            onSave: (vals) => {
                const objectifs = loadData('objectifs', []);
                const typeInfo  = TYPES[vals.type] || {};
                const dir       = vals.direction || typeInfo.dir || 'max';
                const currentVal = isEdit ? existing.valeurActuelle : 0;
                const obj = {
                    id:             isEdit ? existing.id : 'obj_' + Date.now(),
                    titre:          vals.titre.trim() || 'Objectif',
                    type:           vals.type,
                    sousType:       vals.sousType || null,
                    direction:      dir,
                    valeurCible:    parseFloat(vals.valeurCible) || 0,
                    valeurActuelle: currentVal,
                    valeurDepart:   isEdit ? (existing.valeurDepart ?? currentVal) : currentVal,
                    unite:          vals.unite.trim() || typeInfo.unite || '',
                    icone:          vals.icone.trim() || typeInfo.icone || '🎯',
                    couleur:        vals.couleur || COULEURS[0],
                    dateDebut:      vals.dateDebut || null,
                    dateFin:        vals.dateFin || null,
                    actif:          true,
                    atteint:        false,
                };
                obj.valeurActuelle = computeValeurActuelle(obj);
                if (!isEdit) obj.valeurDepart = obj.valeurActuelle;
                obj.atteint = computeAtteint(obj);

                if (isEdit) { objectifs[idx] = obj; }
                else        { objectifs.push(obj); }

                saveData('objectifs', objectifs);
                renderObjectifs();
                window.dispatchEvent(new CustomEvent('suivi:dataChanged'));
            }
        });
    }

    // ── Événements ────────────────────────────────────────────────────────────

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
                    fresh[i].atteint = computeAtteint(fresh[i]);
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
