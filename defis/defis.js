// ============================================================
//  DEFIS.JS — Mode Compétition / Défis entre profils
// ============================================================

(function () {

    const DEFIS_KEY = 'app_defis';

    let activeDefiId = null;

    function getDefis() {
        try { return JSON.parse(localStorage.getItem(DEFIS_KEY) || '[]'); } catch (_) { return []; }
    }

    function saveDefis(d) {
        localStorage.setItem(DEFIS_KEY, JSON.stringify(d));
    }

    function currentProfileId() {
        return localStorage.getItem('currentProfileId') || '_default';
    }

    function getProfiles() {
        try { return JSON.parse(localStorage.getItem('profiles') || '[]'); } catch (_) { return []; }
    }

    function loadProfileData(profileId, key, def) {
        try {
            const raw = localStorage.getItem('profile_' + profileId + '_' + key);
            return raw ? JSON.parse(raw) : def;
        } catch (_) { return def; }
    }

    // ── Calcul du score pour un profil dans un défi ───────────────────────
    function calculerScoreDefi(defi, profileId) {
        const profiles = getProfiles();
        const profile  = profiles.find(p => p.id === profileId);
        const nom      = profile ? profile.name  : profileId;
        const emoji    = profile ? profile.emoji : '👤';

        const debut = defi.dateDebut;
        const fin   = defi.dateFin;

        switch (defi.type) {
            case 'seances': {
                const seances = loadProfileData(profileId, 'seanceData', [])
                    .filter(e => e.date >= debut && e.date <= fin);
                return { profileId, nom, emoji, valeur: seances.length, unite: 'séances' };
            }
            case 'calories_brulees': {
                const seances = loadProfileData(profileId, 'seanceData', [])
                    .filter(e => e.date >= debut && e.date <= fin);
                const total = seances.reduce((s, e) => s + (e.kcal || 0), 0);
                return { profileId, nom, emoji, valeur: total, unite: 'kcal' };
            }
            case 'poids_perdu': {
                const history = loadProfileData(profileId, 'bodyHistory', [])
                    .filter(e => e.date >= debut && e.date <= fin)
                    .sort((a, b) => a.date.localeCompare(b.date));
                if (history.length < 2) return { profileId, nom, emoji, valeur: 0, unite: '%' };
                const diff = history[0].poids - history[history.length - 1].poids;
                const pct  = Math.round((diff / history[0].poids) * 100 * 10) / 10;
                return { profileId, nom, emoji, valeur: Math.max(0, pct), unite: '%' };
            }
            case 'sommeil_moy': {
                const nuits = loadProfileData(profileId, 'sommeilData', [])
                    .filter(e => e.date >= debut && e.date <= fin)
                    .filter(e => e.tempsTotal > 0);
                if (!nuits.length) return { profileId, nom, emoji, valeur: 0, unite: 'h/nuit' };
                const moy = nuits.reduce((s, e) => s + e.tempsTotal, 0) / nuits.length;
                const val = Math.round(moy / 60 * 10) / 10;
                return { profileId, nom, emoji, valeur: val, unite: 'h/nuit' };
            }
            case 'km_cardio': {
                const seances = loadProfileData(profileId, 'seanceData', [])
                    .filter(e => e.date >= debut && e.date <= fin && e.type === 'cardio');
                return { profileId, nom, emoji, valeur: seances.length, unite: 'séances cardio' };
            }
            default:
                return { profileId, nom, emoji, valeur: 0, unite: '' };
        }
    }

    // ── Classement ────────────────────────────────────────────────────────
    function renderClassement(defi) {
        const section = document.getElementById('classementSection');
        const list    = document.getElementById('classementList');
        if (!section || !list) return;

        const myId     = currentProfileId();
        const medals   = ['🥇', '🥈', '🥉'];
        const scores   = defi.participants.map(id => calculerScoreDefi(defi, id));

        // Ajouter les participants externes si présents
        if (defi.participantsExternes) {
            defi.participantsExternes.forEach(pe => {
                scores.push({ profileId: '__ext__' + pe.profileId, nom: pe.profileNom, emoji: pe.profileEmoji, valeur: pe.valeur, unite: pe.unite, externe: true });
            });
        }

        scores.sort((a, b) => b.valeur - a.valeur);

        section.style.display = 'block';
        list.innerHTML = scores.map((s, i) => {
            const rang  = medals[i] || (i + 1);
            const isMoi = s.profileId === myId;
            return `<div class="classement-row ${isMoi ? 'moi' : ''}">
                <div class="classement-rang">${rang}</div>
                <div class="classement-profil">
                    <div class="classement-nom">${s.emoji} ${s.nom}${s.externe ? '<span class="classement-badge-ext">Autre appareil</span>' : ''}</div>
                </div>
                <div class="classement-score">${s.valeur} <span class="classement-unite">${s.unite}</span></div>
            </div>`;
        }).join('');
    }

    // ── Affichage listes défis ────────────────────────────────────────────
    function typeLabel(type) {
        const map = { seances: 'Séances', calories_brulees: 'Calories brûlées', poids_perdu: 'Poids perdu', sommeil_moy: 'Sommeil', km_cardio: 'Cardio' };
        return map[type] || type;
    }

    function fmtDate(iso) {
        if (!iso) return '';
        const d = new Date(iso + 'T00:00:00');
        return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    }

    function defiCard(defi) {
        const profiles  = getProfiles();
        const noms      = defi.participants.map(id => {
            const p = profiles.find(pr => pr.id === id);
            return p ? p.emoji + ' ' + p.name : id;
        }).join(', ');
        const isActive  = defi.id === activeDefiId;
        const today     = new Date().toISOString().slice(0, 10);
        const enCours   = defi.actif && defi.dateFin >= today;
        return `<div class="defi-card ${isActive ? 'active' : ''}" data-id="${defi.id}">
            <div class="defi-card-header">
                <div class="defi-card-title">🏆 ${defi.titre}</div>
                <span class="defi-badge-type">${typeLabel(defi.type)}</span>
            </div>
            <div class="defi-dates">📅 ${fmtDate(defi.dateDebut)} → ${fmtDate(defi.dateFin)}</div>
            <div class="defi-participants">👥 ${noms}</div>
        </div>`;
    }

    function renderDefis() {
        const today = new Date().toISOString().slice(0, 10);
        const defis = getDefis();

        const actifs   = defis.filter(d => d.actif && d.dateFin >= today);
        const termines = defis.filter(d => !d.actif || d.dateFin < today);

        const listActifs   = document.getElementById('defisActifsList');
        const listTermines = document.getElementById('defisTerminesList');
        if (!listActifs) return;

        listActifs.innerHTML   = actifs.length   ? actifs.map(defiCard).join('')   : '<div class="defi-vide">Aucun défi en cours. Crée-en un !</div>';
        listTermines.innerHTML = termines.length  ? termines.map(defiCard).join('') : '<div class="defi-vide">Aucun défi terminé.</div>';

        document.querySelectorAll('.defi-card').forEach(el => {
            el.addEventListener('click', () => {
                const id    = el.dataset.id;
                activeDefiId = (activeDefiId === id) ? null : id;
                renderDefis();
                if (activeDefiId) {
                    const defi = getDefis().find(d => d.id === id);
                    if (defi) renderClassement(defi);
                } else {
                    const section = document.getElementById('classementSection');
                    if (section) section.style.display = 'none';
                }
            });
        });

        // Rafraîchir classement si un défi est sélectionné
        if (activeDefiId) {
            const defi = defis.find(d => d.id === activeDefiId);
            if (defi) renderClassement(defi);
        }
    }

    // ── Création d'un défi ────────────────────────────────────────────────
    function openCreerDefi() {
        if (typeof window.openModal !== 'function') {
            alert('La fonction de modale n\'est pas disponible.');
            return;
        }
        const myId     = currentProfileId();
        const profiles = getProfiles();

        const today = new Date().toISOString().slice(0, 10);
        const nextMonth = new Date(); nextMonth.setMonth(nextMonth.getMonth() + 1);
        const nextIso = nextMonth.toISOString().slice(0, 10);

        window.openModal({
            title: 'Nouveau défi',
            fields: [
                { key: 'titre',     label: 'Titre du défi', type: 'text', placeholder: 'Roi des séances de janvier' },
                { key: 'type',      label: 'Type', type: 'select', options: [
                    ['seances',          '🏋️ Séances (nombre)'],
                    ['calories_brulees', '🔥 Calories brûlées'],
                    ['poids_perdu',      '⚖️ Poids perdu (%)'],
                    ['sommeil_moy',      '😴 Sommeil moyen'],
                    ['km_cardio',        '🏃 Séances cardio'],
                ]},
                { key: 'dateDebut', label: 'Date de début', type: 'date' },
                { key: 'dateFin',   label: 'Date de fin',   type: 'date' },
            ],
            values: { titre: '', type: 'seances', dateDebut: today, dateFin: nextIso },
            onSave(vals) {
                if (!vals.titre || !vals.dateDebut || !vals.dateFin) return;
                const defis = getDefis();
                const participants = [myId];
                // Ajouter automatiquement tous les profils locaux
                profiles.forEach(p => { if (p.id !== myId) participants.push(p.id); });

                defis.push({
                    id:          'defi_' + Date.now(),
                    titre:       vals.titre,
                    type:        vals.type || 'seances',
                    dateDebut:   vals.dateDebut,
                    dateFin:     vals.dateFin,
                    creePar:     myId,
                    participants,
                    actif:       true
                });
                saveDefis(defis);
                renderDefis();
            }
        });
    }

    // ── Export des résultats ──────────────────────────────────────────────
    function exporterResultats() {
        const myId     = currentProfileId();
        const profiles = getProfiles();
        const profile  = profiles.find(p => p.id === myId);
        const defis    = getDefis().filter(d => d.participants.includes(myId));

        const exportData = {
            profileId:    myId,
            profileNom:   profile ? profile.name  : myId,
            profileEmoji: profile ? profile.emoji : '👤',
            exportDate:   new Date().toISOString(),
            defis: defis.map(d => {
                const score = calculerScoreDefi(d, myId);
                return {
                    defiId:    d.id,
                    titre:     d.titre,
                    type:      d.type,
                    dateDebut: d.dateDebut,
                    dateFin:   d.dateFin,
                    valeur:    score.valeur,
                    unite:     score.unite
                };
            })
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `resultats_defis_${(profile ? profile.name : myId).replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    // ── Import des résultats d'un ami ─────────────────────────────────────
    function importerResultats(file) {
        if (!file) return;
        const resultDiv = document.getElementById('defiImportResult');
        const reader = new FileReader();
        reader.onload = function (e) {
            try {
                const data = JSON.parse(e.target.result);
                if (!data.defis || !Array.isArray(data.defis)) throw new Error('Format invalide');

                const defis  = getDefis();
                let imported = 0;

                data.defis.forEach(extDefi => {
                    // Chercher le défi correspondant par id ou par titre+dates
                    let defi = defis.find(d => d.id === extDefi.defiId);
                    if (!defi) {
                        defi = defis.find(d =>
                            d.titre === extDefi.titre &&
                            d.dateDebut === extDefi.dateDebut &&
                            d.dateFin   === extDefi.dateFin
                        );
                    }
                    if (!defi) return;

                    if (!defi.participantsExternes) defi.participantsExternes = [];
                    // Éviter les doublons
                    const exists = defi.participantsExternes.some(pe => pe.profileId === data.profileId);
                    if (!exists) {
                        defi.participantsExternes.push({
                            profileId:    data.profileId,
                            profileNom:   data.profileNom,
                            profileEmoji: data.profileEmoji,
                            valeur:       extDefi.valeur,
                            unite:        extDefi.unite
                        });
                        imported++;
                    }
                });

                saveDefis(defis);
                renderDefis();

                if (resultDiv) {
                    resultDiv.innerHTML = imported > 0
                        ? `<span style="color:var(--success)">✓ ${imported} résultat(s) importé(s) pour ${data.profileEmoji} ${data.profileNom}</span>`
                        : `<span style="color:var(--text-3)">Aucun défi correspondant trouvé. Assure-toi d'avoir les mêmes défis créés.</span>`;
                }
            } catch (err) {
                if (resultDiv) resultDiv.innerHTML = `<span style="color:var(--error)">Erreur : ${err.message}</span>`;
            }
        };
        reader.readAsText(file);
    }

    // ── Init ──────────────────────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', function () {
        const btnNouveau = document.getElementById('btnNouveauDefi');
        const btnExport  = document.getElementById('btnExportDefi');
        const fileInput  = document.getElementById('defiImportFile');
        const btnRefresh = document.getElementById('btnRefreshClassement');

        if (btnNouveau) btnNouveau.addEventListener('click', openCreerDefi);
        if (btnExport)  btnExport.addEventListener('click', exporterResultats);
        if (fileInput)  fileInput.addEventListener('change', (e) => {
            importerResultats(e.target.files[0]);
            e.target.value = '';
        });
        if (btnRefresh) btnRefresh.addEventListener('click', () => {
            if (activeDefiId) {
                const defi = getDefis().find(d => d.id === activeDefiId);
                if (defi) renderClassement(defi);
            }
        });

        window.addEventListener('suivi:dataChanged', renderDefis);
        renderDefis();
    });

})();
