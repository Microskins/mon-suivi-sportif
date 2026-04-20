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

    // ── Taux de gras ──────────────────────────────────────────────────────────

    function getSexe() {
        const profiles = JSON.parse(localStorage.getItem('profiles') || '[]');
        const currentId = localStorage.getItem('currentProfileId');
        return profiles.find(p => p.id === currentId)?.sexe || 'homme';
    }

    function computeBodyFat(taille, cou, tailleMens, hanches, sexe) {
        if (!taille || !cou || !tailleMens) return null;
        if (sexe === 'femme' && !hanches) return null;
        if (tailleMens <= cou) return null;
        let taux;
        // Constantes ajustées pour mesures en cm (formule Hodgdon & Beckett, originalement en pouces)
        if (sexe === 'femme') {
            if (tailleMens + hanches - cou <= 0) return null;
            taux = 495 / (1.34803 - 0.35004 * Math.log10(tailleMens + hanches - cou) + 0.22100 * Math.log10(taille)) - 450;
        } else {
            taux = 495 / (1.04706 - 0.19077 * Math.log10(tailleMens - cou) + 0.15456 * Math.log10(taille)) - 450;
        }
        if (taux < 2 || taux > 70) return null;
        return Math.round(taux * 10) / 10;
    }

    function bodyFatCategorie(taux, sexe) {
        if (sexe === 'femme') {
            if (taux < 14) return { label: 'Athlétique', cls: 'bf-athletic' };
            if (taux < 21) return { label: 'Fitness',    cls: 'bf-fitness'  };
            if (taux < 32) return { label: 'Acceptable', cls: 'bf-acceptable' };
            return            { label: 'Obèse',       cls: 'bf-obese'    };
        } else {
            if (taux < 6)  return { label: 'Athlétique', cls: 'bf-athletic' };
            if (taux < 14) return { label: 'Fitness',    cls: 'bf-fitness'  };
            if (taux < 25) return { label: 'Acceptable', cls: 'bf-acceptable' };
            return           { label: 'Obèse',       cls: 'bf-obese'    };
        }
    }

    function saveBodyFatEntry(date) {
        const settings = window.loadBodySettings();
        if (!settings?.taille) return;
        const mensData = loadData('mensurationsData');
        const entry = mensData.find(e => e.date === date);
        if (!entry) return;
        const sexe = getSexe();
        const taux = computeBodyFat(settings.taille, entry.cou, entry.tailleMens, entry.hanches, sexe);
        if (taux === null) return;
        const graisseData = loadData('graisseCorporelleData');
        const idx = graisseData.findIndex(e => e.date === date);
        if (idx >= 0) graisseData[idx] = { date, taux };
        else graisseData.push({ date, taux });
        saveData('graisseCorporelleData', graisseData);
    }

    let chartGraisse = null;

    function renderBodyFat() {
        const section = document.getElementById('bodyFatSection');
        const display = document.getElementById('bodyFatDisplay');
        if (!section || !display) return;

        const settings = window.loadBodySettings();
        const mensData = loadData('mensurationsData');
        const sexe = getSexe();

        if (!settings?.taille || mensData.length === 0) { section.style.display = 'none'; return; }

        const last = [...mensData].sort((a, b) => b.date.localeCompare(a.date))[0];
        const taux = computeBodyFat(settings.taille, last.cou, last.tailleMens, last.hanches, sexe);

        if (taux === null) { section.style.display = 'none'; return; }

        section.style.display = '';
        const cat = bodyFatCategorie(taux, sexe);
        const maxPct = sexe === 'femme' ? 45 : 35;
        const markerPct = Math.min(100, Math.max(0, (taux / maxPct) * 100));

        const seuils = sexe === 'femme'
            ? [{ v: 14, l: '14%' }, { v: 21, l: '21%' }, { v: 32, l: '32%' }]
            : [{ v: 6,  l: '6%'  }, { v: 14, l: '14%' }, { v: 25, l: '25%' }];

        display.innerHTML = `
            <div class="bf-result">
                <div class="bf-top">
                    <span class="bf-value ${cat.cls}">${taux}%</span>
                    <span class="bf-cat-badge ${cat.cls}">${cat.label}</span>
                </div>
                <div class="bf-gauge-wrap">
                    <div class="bf-gauge">
                        <span class="bf-marker" style="left:${markerPct}%"></span>
                    </div>
                    <div class="bf-gauge-labels">
                        ${seuils.map(s => `<span style="left:${(s.v/maxPct*100).toFixed(1)}%">${s.l}</span>`).join('')}
                    </div>
                </div>
            </div>`;

        // Graphique historique
        const graisseData = loadData('graisseCorporelleData');
        const canvas = document.getElementById('chartGraisse');
        const chartWrap = document.getElementById('bodyFatChartWrap');
        if (!canvas) return;
        if (graisseData.length < 2) { if (chartWrap) chartWrap.style.display = 'none'; return; }
        if (chartWrap) chartWrap.style.display = '';
        if (chartGraisse) { chartGraisse.destroy(); chartGraisse = null; }
        const sorted = [...graisseData].sort((a, b) => a.date.localeCompare(b.date));
        chartGraisse = new Chart(canvas, {
            type: 'line',
            data: {
                labels: sorted.map(e => e.date),
                datasets: [{
                    label: 'Taux de gras (%)',
                    data: sorted.map(e => e.taux),
                    borderColor: 'var(--primary)',
                    backgroundColor: 'rgba(99,102,241,0.1)',
                    tension: 0.3,
                    pointRadius: 4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: { y: { title: { display: true, text: '%' }, min: 0 } }
            }
        });
    }

    // ── Stats display ─────────────────────────────────────────────────────────

    function renderDisplay() {
        const settings = window.loadBodySettings();
        if (!settings) { bodyDataDisplay.innerHTML = ''; return; }

        const imc = (settings.poids / Math.pow(settings.taille / 100, 2)).toFixed(1);
        const age = calculateAge(settings.age);

        // BMR : Katch-McArdle si taux de gras dispo, sinon Mifflin-St Jeor
        const graisseData = loadData('graisseCorporelleData');
        let bmr, bmrLabel;
        if (graisseData.length > 0) {
            const lastTaux = [...graisseData].sort((a, b) => b.date.localeCompare(a.date))[0].taux;
            const masseMaigre = settings.poids * (1 - lastTaux / 100);
            bmr = Math.round(370 + 21.6 * masseMaigre);
            bmrLabel = 'BMR (Katch-McArdle)';
        } else {
            bmr = Math.round(10 * settings.poids + 6.25 * settings.taille - 5 * age - 78);
            bmrLabel = 'BMR (Mifflin)';
        }

        // Taux de gras (stat card)
        let graisseCard = '';
        if (graisseData.length > 0) {
            const lastTaux = [...graisseData].sort((a, b) => b.date.localeCompare(a.date))[0].taux;
            const sexe = getSexe();
            const cat = bodyFatCategorie(lastTaux, sexe);
            graisseCard = `<div class="stat-card"><span class="stat-val ${cat.cls}">${lastTaux}%</span><span class="stat-lbl">Taux de gras — ${cat.label}</span></div>`;
        }

        // RTH
        let rthCard = '';
        const mensData = loadData('mensurationsData');
        if (mensData.length > 0) {
            const last = [...mensData].sort((a, b) => b.date.localeCompare(a.date))[0];
            if (last.tailleMens && last.hanches) {
                const rthVal = last.tailleMens / last.hanches;
                const rth = rthVal.toFixed(2);
                const sexe = getSexe();
                const seuil = sexe === 'femme' ? 0.85 : 0.90;
                let rthClass, rthLabel;
                if (rthVal <= seuil)             { rthClass = 'rth-ok';     rthLabel = 'Normal'; }
                else if (rthVal <= seuil + 0.09) { rthClass = 'rth-warn';   rthLabel = 'Légèrement élevé'; }
                else                             { rthClass = 'rth-danger'; rthLabel = 'Élevé'; }
                rthCard = `<div class="stat-card ${rthClass}"><span class="stat-val">${rth}</span><span class="stat-lbl">RTH — ${rthLabel}</span></div>`;
            }
        }

        const hasExtra = !!(graisseCard || rthCard);
        bodyDataDisplay.innerHTML = `
            <div class="body-stats${hasExtra ? ' has-rth' : ''}">
                <div class="stat-card"><span class="stat-val">${age} ans</span><span class="stat-lbl">Âge</span></div>
                <div class="stat-card"><span class="stat-val">${imc}</span><span class="stat-lbl">IMC — ${imcCategorie(parseFloat(imc))}</span></div>
                <div class="stat-card"><span class="stat-val">${bmr} kcal</span><span class="stat-lbl">${bmrLabel}</span></div>
                ${graisseCard}
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
                    { key: 'date',  label: 'Date',       type: 'date'   },
                    { key: 'poids', label: 'Poids (kg)',  type: 'number', step: 0.1, min: 0 },
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
        window.saveBodySettings(settings);
        const history = loadData('bodyHistory');
        history.push({ date: document.getElementById('date-body').value, poids: settings.poids });
        saveData('bodyHistory', history);
        renderDisplay();
        renderHistory();
        renderBodyFat();
        showFeedback(feedbackEl, 'Données corporelles enregistrées !');
    });

    // Pré-remplir le formulaire
    const saved = window.loadBodySettings();
    if (saved) {
        if (saved.poids)  document.getElementById('poids').value  = saved.poids;
        if (saved.taille) document.getElementById('taille').value = saved.taille;
        if (saved.age)    document.getElementById('age').value    = saved.age;
    }

    renderDisplay();
    renderHistory();
    renderBodyFat();

    // ── Mensurations ──────────────────────────────────────────────────────────

    const mensFeedback = document.getElementById('mensurationFeedback');

    document.getElementById('date-mensuration').valueAsDate = new Date();

    function getMensValues() {
        return {
            date:       document.getElementById('date-mensuration').value,
            epaules:    parseFloat(document.getElementById('m-epaules').value)   || null,
            cou:        parseFloat(document.getElementById('m-cou').value)        || null,
            poitrine:   parseFloat(document.getElementById('m-poitrine').value)   || null,
            tailleMens: parseFloat(document.getElementById('m-taille-m').value)   || null,
            hanches:    parseFloat(document.getElementById('m-hanches').value)    || null,
            biceps:     parseFloat(document.getElementById('m-biceps').value)     || null,
            avantbras:  parseFloat(document.getElementById('m-avantbras').value)  || null,
            cuisses:    parseFloat(document.getElementById('m-cuisses').value)    || null,
            mollets:    parseFloat(document.getElementById('m-mollets').value)    || null,
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
            renderBodyFat();
        }

        if (e.target.classList.contains('btn-edit')) {
            openModal({
                title: 'Modifier les mensurations',
                fields: [
                    { key: 'date',       label: 'Date',                    type: 'date'   },
                    { key: 'epaules',    label: 'Épaules (cm)',            type: 'number', step: 0.1, min: 0 },
                    { key: 'cou',        label: 'Cou (cm)',                type: 'number', step: 0.1, min: 0 },
                    { key: 'poitrine',   label: 'Poitrine (cm)',           type: 'number', step: 0.1, min: 0 },
                    { key: 'tailleMens', label: 'Tour de taille (cm)',     type: 'number', step: 0.1, min: 0 },
                    { key: 'hanches',    label: 'Hanches (cm)',            type: 'number', step: 0.1, min: 0 },
                    { key: 'biceps',     label: 'Biceps (cm)',             type: 'number', step: 0.1, min: 0 },
                    { key: 'avantbras',  label: 'Avant-bras (cm)',         type: 'number', step: 0.1, min: 0 },
                    { key: 'cuisses',    label: 'Cuisses (cm)',            type: 'number', step: 0.1, min: 0 },
                    { key: 'mollets',    label: 'Mollets (cm)',            type: 'number', step: 0.1, min: 0 },
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
                    saveBodyFatEntry(vals.date);
                    renderMensurationsTable();
                    renderDisplay();
                    renderBodyFat();
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
        saveBodyFatEntry(entry.date);
        renderMensurationsTable();
        renderDisplay();
        renderBodyFat();
        showFeedback(mensFeedback, 'Mensurations enregistrées !');
    });

    renderMensurations();
    renderMensurationsTable();
    window.addEventListener('suivi:dataChanged', () => {
        renderDisplay();
        renderHistory();
        renderMensurations();
        renderMensurationsTable();
        renderBodyFat();
    });

    // ── Galerie Photos de Progression ────────────────────────────────────────

    const MAX_PHOTOS = 20;
    let lightboxPhotoId = null;

    function compressImage(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const img = new Image();
                img.onload = () => {
                    const MAX = 800;
                    let w = img.width, h = img.height;
                    if (w > MAX || h > MAX) {
                        if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
                        else       { w = Math.round(w * MAX / h); h = MAX; }
                    }
                    const canvas = document.createElement('canvas');
                    canvas.width  = w;
                    canvas.height = h;
                    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                    resolve(canvas.toDataURL('image/jpeg', 0.75));
                };
                img.src = ev.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    function renderPhotos() {
        const grid = document.getElementById('photosGrid');
        if (!grid) return;
        const photos = loadData('photosData', []);

        if (photos.length === 0) {
            grid.innerHTML = '<p class="photos-empty">Aucune photo — clique sur "+ Ajouter" pour commencer</p>';
            return;
        }

        grid.innerHTML = photos.map(p =>
            `<div class="photo-thumb" data-id="${p.id}">
                <img src="${p.dataUrl}" alt="${p.date}" loading="lazy">
                <div class="photo-thumb-date">${p.date}</div>
            </div>`
        ).join('');
    }

    function openLightbox(id) {
        const photos = loadData('photosData', []);
        const photo  = photos.find(p => p.id === id);
        if (!photo) return;
        lightboxPhotoId = id;
        document.getElementById('lightboxImg').src         = photo.dataUrl;
        document.getElementById('lightboxCaption').textContent = photo.date;
        document.getElementById('photoLightbox').style.display = 'flex';
    }

    function closeLightbox() {
        document.getElementById('photoLightbox').style.display = 'none';
        lightboxPhotoId = null;
    }

    function openCompareModal() {
        const photos = loadData('photosData', []);
        const makeOptions = () => photos.map(p =>
            `<option value="${p.id}">${p.date}</option>`
        ).join('');
        const selA = document.getElementById('compareSelA');
        const selB = document.getElementById('compareSelB');
        if (!selA || !selB) return;
        selA.innerHTML = makeOptions();
        selB.innerHTML = makeOptions();
        if (photos.length > 1) selB.selectedIndex = photos.length - 1;

        const updateImages = () => {
            const a = photos.find(p => p.id === selA.value);
            const b = photos.find(p => p.id === selB.value);
            if (a) document.getElementById('compareImgA').src = a.dataUrl;
            if (b) document.getElementById('compareImgB').src = b.dataUrl;
        };
        selA.onchange = updateImages;
        selB.onchange = updateImages;
        updateImages();

        document.getElementById('compareModal').style.display = 'flex';
        closeLightbox();
    }

    // Upload
    document.getElementById('photoInput')?.addEventListener('change', async (e) => {
        const files  = Array.from(e.target.files);
        const photos = loadData('photosData', []);
        let added    = 0;

        for (const file of files) {
            if (photos.length + added >= MAX_PHOTOS) {
                alert(`Maximum ${MAX_PHOTOS} photos atteint.`);
                break;
            }
            const dataUrl = await compressImage(file);
            photos.push({
                id:      'photo_' + Date.now() + '_' + Math.random().toString(36).slice(2),
                date:    new Date().toISOString().split('T')[0],
                dataUrl,
            });
            added++;
        }

        if (added > 0) {
            saveData('photosData', photos);
            renderPhotos();
        }
        e.target.value = '';
    });

    // Clic sur une photo → lightbox
    document.getElementById('photosGrid')?.addEventListener('click', (e) => {
        const thumb = e.target.closest('.photo-thumb');
        if (thumb) openLightbox(thumb.dataset.id);
    });

    // Lightbox actions
    document.getElementById('lightboxOverlay')?.addEventListener('click', closeLightbox);
    document.getElementById('lightboxClose')?.addEventListener('click', closeLightbox);

    document.getElementById('btnDeletePhoto')?.addEventListener('click', () => {
        if (!lightboxPhotoId) return;
        const photos = loadData('photosData', []).filter(p => p.id !== lightboxPhotoId);
        saveData('photosData', photos);
        closeLightbox();
        renderPhotos();
    });

    document.getElementById('btnComparePhoto')?.addEventListener('click', openCompareModal);

    // Compare modal
    document.getElementById('compareOverlay')?.addEventListener('click', () => {
        document.getElementById('compareModal').style.display = 'none';
    });
    document.getElementById('compareClose')?.addEventListener('click', () => {
        document.getElementById('compareModal').style.display = 'none';
    });

    renderPhotos();
});
