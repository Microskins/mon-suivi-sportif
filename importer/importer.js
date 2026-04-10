// ============================================================
//  IMPORTER.JS — Google Fit + CSV import + JSON export
// ============================================================

document.addEventListener('DOMContentLoaded', function () {

    // ── Constantes Google Fit ────────────────────────────────
    const GFIT_SCOPES = [
        'https://www.googleapis.com/auth/fitness.body.read',
        'https://www.googleapis.com/auth/fitness.sleep.read',
        'https://www.googleapis.com/auth/fitness.activity.read',
        'https://www.googleapis.com/auth/fitness.nutrition.read',
        'https://www.googleapis.com/auth/fitness.oxygen_saturation.read'
    ].join(' ');

    const GFIT_BASE = 'https://www.googleapis.com/fitness/v1/users/me';

    // Types d'activités Google Fit → notre format
    const ACTIVITY_MAP = {
        7: 'musculation', 8: 'cardio', 9: 'cardio', 15: 'sport-co',
        17: 'musculation', 21: 'cardio', 29: 'musculation', 37: 'cardio',
        41: 'sport-co', 45: 'cardio', 56: 'cardio', 59: 'musculation',
        82: 'yoga', 97: 'cardio', 108: 'hiit'
    };

    let gfitToken = null;
    let tokenClient = null;
    let parsedCsvData = null;
    let pendingConnect = false;   // true = déclencher requestAccessToken dès que tokenClient est prêt

    // ── Initialisation ───────────────────────────────────────

    // Vérification protocole file://
    if (window.location.protocol === 'file:') {
        const warn = document.createElement('div');
        warn.className = 'feedback feedback-error';
        warn.style.cssText = 'margin-bottom:16px;font-size:14px';
        warn.innerHTML = '⚠️ <strong>Tu ouvres le fichier en file://</strong> — Google OAuth ne fonctionnera pas.<br>'
            + 'Dans VSCode : clic droit sur <code>index.html</code> → <strong>"Open with Live Server"</strong>.<br>'
            + 'Ou dans un terminal : <code>npx serve .</code> puis ouvre <code>http://localhost:3000</code>';
        document.getElementById('section-gfit').prepend(warn);
    }

    const savedClientId = localStorage.getItem('gfitClientId') || '';
    document.getElementById('gfit-client-id').value = savedClientId;

    // Dates par défaut : 30 derniers jours
    const today = new Date();
    const monthAgo = new Date(today);
    monthAgo.setDate(today.getDate() - 30);
    document.getElementById('gfit-end').valueAsDate = today;
    document.getElementById('gfit-start').valueAsDate = monthAgo;

    if (savedClientId) {
        setGfitStatus('Chargement Google...', '');
        initGoogleAuth(savedClientId);
    }

    // ── Sauvegarde Client ID ─────────────────────────────────

    document.getElementById('btn-save-client-id').addEventListener('click', () => {
        const clientId = document.getElementById('gfit-client-id').value.trim();
        if (!clientId) {
            setGfitStatus('Entre ton Client ID avant de sauvegarder', 'error');
            return;
        }
        localStorage.setItem('gfitClientId', clientId);
        tokenClient = null; // forcer la réinitialisation si le client ID change
        setGfitStatus('Client ID sauvegardé — chargement...', '');
        initGoogleAuth(clientId);
    });

    // ── Google Identity Services ─────────────────────────────

    function initGoogleAuth(clientId) {
        // Lib déjà chargée
        if (typeof google !== 'undefined' && google.accounts) {
            setupTokenClient(clientId);
            return;
        }
        // Lib déjà en cours de chargement (balise script déjà dans le DOM)
        if (document.querySelector('script[src*="accounts.google.com/gsi"]')) {
            const wait = setInterval(() => {
                if (typeof google !== 'undefined' && google.accounts) {
                    clearInterval(wait);
                    setupTokenClient(clientId);
                }
            }, 100);
            return;
        }
        // Charger la lib
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => setupTokenClient(clientId);
        script.onerror = () => setGfitStatus('❌ Impossible de charger la lib Google (vérifies ta connexion internet)', 'error');
        document.head.appendChild(script);
    }

    function setupTokenClient(clientId) {
        try {
            tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: clientId,
                scope: GFIT_SCOPES,
                callback: (resp) => {
                    if (resp.error) {
                        const msg = resp.error === 'popup_blocked_by_browser'
                            ? '❌ Popup bloquée — autorise les popups pour ce site dans ton navigateur'
                            : `❌ Erreur : ${resp.error}`;
                        setGfitStatus(msg, 'error');
                        return;
                    }
                    gfitToken = resp.access_token;
                    setGfitStatus('✓ Connecté à Google Fit', 'success');
                    document.getElementById('gfit-import-panel').style.display = 'block';
                }
            });
            setGfitStatus('✓ Prêt — clique sur "Se connecter"', '');

            // Déclencher automatiquement si le bouton avait déjà été cliqué
            if (pendingConnect) {
                pendingConnect = false;
                tokenClient.requestAccessToken();
            }
        } catch (e) {
            setGfitStatus('❌ Erreur init OAuth : ' + e.message, 'error');
        }
    }

    document.getElementById('btn-connect-gfit').addEventListener('click', () => {
        const clientId = document.getElementById('gfit-client-id').value.trim();
        if (!clientId) {
            setGfitStatus('⚠️ Entre et sauvegarde ton Client ID d\'abord', 'error');
            return;
        }
        if (tokenClient) {
            // Prêt : ouvrir le popup Google
            tokenClient.requestAccessToken();
        } else {
            // Pas encore prêt : charger et connecter dès que possible
            pendingConnect = true;
            setGfitStatus('Chargement en cours...', '');
            initGoogleAuth(clientId);
        }
    });

    function setGfitStatus(msg, type = '') {
        const el = document.getElementById('gfit-status');
        el.textContent = msg;
        el.className = `gfit-status ${type}`;
    }

    // ── Appels API Google Fit ────────────────────────────────

    async function gfitGet(path, params = {}) {
        const url = new URL(`${GFIT_BASE}/${path}`);
        Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
        const r = await fetch(url, { headers: { Authorization: `Bearer ${gfitToken}` } });
        if (!r.ok) throw new Error(`Google Fit API ${r.status}: ${await r.text()}`);
        return r.json();
    }

    async function gfitAggregate(body) {
        const r = await fetch(`${GFIT_BASE}/dataset:aggregate`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${gfitToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!r.ok) throw new Error(`Google Fit aggregate ${r.status}`);
        return r.json();
    }

    function dateToMs(dateStr) { return new Date(dateStr).getTime(); }
    function msToDate(ms) { return new Date(ms).toISOString().split('T')[0]; }
    function dateToNs(dateStr) { return dateToMs(dateStr) * 1_000_000; }

    // ── Import Poids depuis Google Fit ───────────────────────

    async function importPoids(start, end) {
        const data = await gfitAggregate({
            aggregateBy: [{ dataTypeName: 'com.google.weight' }],
            bucketByTime: { durationMillis: 86_400_000 },
            startTimeMillis: dateToMs(start),
            endTimeMillis: dateToMs(end) + 86_400_000
        });

        const history = loadData('bodyHistory');
        let count = 0;

        for (const bucket of data.bucket || []) {
            const date = msToDate(parseInt(bucket.startTimeMillis));
            for (const ds of bucket.dataset || []) {
                for (const pt of ds.point || []) {
                    const poids = pt.value?.[0]?.fpVal;
                    if (!poids) continue;
                    if (!history.find(h => h.date === date)) {
                        history.push({ date, poids: Math.round(poids * 10) / 10, tourTaille: 0 });
                        count++;
                    }
                }
            }
        }

        if (count > 0) {
            saveData('bodyHistory', history);
            history.sort((a, b) => b.date.localeCompare(a.date));
            const last = history[0];
            const saved = JSON.parse(localStorage.getItem('bodySettings') || '{}');
            saved.poids = last.poids;
            localStorage.setItem('bodySettings', JSON.stringify(saved));
        }
        return count;
    }

    // ── Import Sommeil depuis Google Fit ─────────────────────

    async function importSommeil(start, end) {
        // Récupérer les sessions de sommeil
        const sessions = await gfitGet('sessions', {
            activityType: 72,
            startTime: new Date(start).toISOString(),
            endTime: new Date(dateToMs(end) + 86_400_000).toISOString()
        });

        if (!sessions.session?.length) return 0;

        // Récupérer les stages de sommeil
        const stagesData = await gfitAggregate({
            aggregateBy: [{ dataTypeName: 'com.google.sleep.segment' }],
            startTimeMillis: dateToMs(start),
            endTimeMillis: dateToMs(end) + 86_400_000
        });

        // Construire une map date → stages
        const stageMap = {};
        for (const bucket of stagesData.bucket || []) {
            for (const ds of bucket.dataset || []) {
                for (const pt of ds.point || []) {
                    const date = msToDate(parseInt(pt.startTimeNanos) / 1_000_000);
                    const stageType = pt.value?.[0]?.intVal;
                    const durationMin = Math.round((parseInt(pt.endTimeNanos) - parseInt(pt.startTimeNanos)) / 60_000_000_000);
                    if (!stageMap[date]) stageMap[date] = { rem: 0, profond: 0, leger: 0 };
                    if (stageType === 6) stageMap[date].rem += durationMin;
                    else if (stageType === 5) stageMap[date].profond += durationMin;
                    else if (stageType === 4) stageMap[date].leger += durationMin;
                }
            }
        }

        // Récupérer fréquence cardiaque + SpO2
        const bioData = await gfitAggregate({
            aggregateBy: [
                { dataTypeName: 'com.google.heart_rate.bpm' },
                { dataTypeName: 'com.google.oxygen_saturation' }
            ],
            bucketByTime: { durationMillis: 86_400_000 },
            startTimeMillis: dateToMs(start),
            endTimeMillis: dateToMs(end) + 86_400_000
        });

        const bioMap = {};
        for (const bucket of bioData.bucket || []) {
            const date = msToDate(parseInt(bucket.startTimeMillis));
            bioMap[date] = { bpm: 0, oxygen: 0 };
            for (const ds of bucket.dataset || []) {
                for (const pt of ds.point || []) {
                    const type = ds.dataSourceId?.includes('heart_rate') ? 'bpm' : 'oxygen';
                    const val = pt.value?.[0]?.fpVal || pt.value?.[0]?.intVal;
                    if (val) bioMap[date][type] = Math.round(val);
                }
            }
        }

        const sommeilData = loadData('sommeilData');
        let count = 0;

        for (const session of sessions.session) {
            const date = msToDate(parseInt(session.startTimeMillis));
            if (sommeilData.find(s => s.date === date)) continue;

            const durMin = Math.round((parseInt(session.endTimeMillis) - parseInt(session.startTimeMillis)) / 60_000);
            const stages = stageMap[date] || {};
            const bio = bioMap[date] || {};

            sommeilData.push({
                date,
                apnee: 0,
                rem: stages.rem || 0,
                profond: stages.profond || 0,
                leger: stages.leger || 0,
                tempsTotal: durMin,
                bpm: bio.bpm || 0,
                oxygen: bio.oxygen || 0
            });
            count++;
        }

        if (count > 0) saveData('sommeilData', sommeilData);
        return count;
    }

    // ── Import Séances depuis Google Fit ─────────────────────

    async function importSeances(start, end) {
        const sessions = await gfitGet('sessions', {
            startTime: new Date(start).toISOString(),
            endTime: new Date(dateToMs(end) + 86_400_000).toISOString()
        });

        const filtered = (sessions.session || []).filter(s => s.activityType !== 72);
        if (!filtered.length) return 0;

        // Récupérer les calories brûlées
        const calData = await gfitAggregate({
            aggregateBy: [{ dataTypeName: 'com.google.calories.expended' }],
            bucketByTime: { durationMillis: 86_400_000 },
            startTimeMillis: dateToMs(start),
            endTimeMillis: dateToMs(end) + 86_400_000
        });

        const calMap = {};
        for (const bucket of calData.bucket || []) {
            const date = msToDate(parseInt(bucket.startTimeMillis));
            for (const ds of bucket.dataset || []) {
                for (const pt of ds.point || []) {
                    calMap[date] = Math.round(pt.value?.[0]?.fpVal || 0);
                }
            }
        }

        const seanceData = loadData('seanceData');
        let count = 0;

        for (const session of filtered) {
            const date = msToDate(parseInt(session.startTimeMillis));
            const durMin = Math.round((parseInt(session.endTimeMillis) - parseInt(session.startTimeMillis)) / 60_000);
            if (durMin < 5) continue;

            const type = ACTIVITY_MAP[session.activityType] || 'autre';
            seanceData.push({
                date,
                type,
                duree: durMin,
                kcal: calMap[date] || 0,
                ressenti: 3,
                exercices: session.name || ''
            });
            count++;
        }

        if (count > 0) saveData('seanceData', seanceData);
        return count;
    }

    // ── Import Nutrition depuis Google Fit ───────────────────

    async function importNutrition(start, end) {
        const data = await gfitAggregate({
            aggregateBy: [{ dataTypeName: 'com.google.nutrition' }],
            bucketByTime: { durationMillis: 86_400_000 },
            startTimeMillis: dateToMs(start),
            endTimeMillis: dateToMs(end) + 86_400_000
        });

        const repasData = loadData('repasData');
        let count = 0;

        for (const bucket of data.bucket || []) {
            const date = msToDate(parseInt(bucket.startTimeMillis));
            for (const ds of bucket.dataset || []) {
                for (const pt of ds.point || []) {
                    const map = {};
                    (pt.value || []).forEach(v => { if (v.mapVal) v.mapVal.forEach(e => { map[e.key] = e.value?.fpVal || 0; }); });
                    const kcal = Math.round(map['calories'] || 0);
                    if (!kcal) continue;
                    repasData.push({
                        date,
                        type: 'dejeuner',
                        aliments: pt.value?.[0]?.stringVal || '',
                        calories: kcal,
                        proteines: Math.round(map['protein'] || 0),
                        glucides: Math.round(map['total_carbs'] || 0),
                        lipides: Math.round(map['total_fat'] || 0)
                    });
                    count++;
                }
            }
        }

        if (count > 0) saveData('repasData', repasData);
        return count;
    }

    // ── Boutons import par catégorie ─────────────────────────

    document.querySelectorAll('.btn-import-cat').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (!gfitToken) { setGfitStatus('Connecte-toi d\'abord à Google Fit', 'error'); return; }
            const cat = btn.getAttribute('data-cat');
            const start = document.getElementById('gfit-start').value;
            const end = document.getElementById('gfit-end').value;
            const resultEl = document.getElementById('gfit-result');

            btn.disabled = true;
            btn.textContent = '⏳ Import en cours…';
            resultEl.textContent = '';

            try {
                let count = 0;
                if (cat === 'poids') count = await importPoids(start, end);
                else if (cat === 'sommeil') count = await importSommeil(start, end);
                else if (cat === 'seances') count = await importSeances(start, end);
                else if (cat === 'nutrition') count = await importNutrition(start, end);

                resultEl.className = 'gfit-result success';
                resultEl.textContent = count > 0
                    ? `✓ ${count} entrée(s) importée(s) avec succès`
                    : 'Aucune nouvelle donnée trouvée pour cette période';
            } catch (e) {
                resultEl.className = 'gfit-result error';
                resultEl.textContent = `Erreur : ${e.message}`;
            } finally {
                const labels = { poids: '⚖️ Poids', sommeil: '😴 Sommeil', seances: '🏋️ Séances', nutrition: '🥗 Nutrition' };
                btn.textContent = labels[cat];
                btn.disabled = false;
            }
        });
    });

    // ============================================================
    //  IMPORT CSV
    // ============================================================

    const dropZone = document.getElementById('csv-drop-zone');
    const fileInput = document.getElementById('csv-file-input');
    let rawFileContent = null;

    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
    dropZone.addEventListener('drop', e => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        handleFile(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener('change', e => handleFile(e.target.files[0]));

    function handleFile(file) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = e => {
            rawFileContent = e.target.result;
            document.getElementById('csv-filename').textContent = file.name;
            const lineCount = rawFileContent.trim().split('\n').length - 1;
            document.getElementById('csv-row-count').textContent = ` — ${lineCount} ligne(s)`;
            document.getElementById('csv-preview').style.display = 'flex';
            document.getElementById('csv-result').textContent = '';
        };
        reader.readAsText(file, 'UTF-8');
    }

    document.getElementById('btn-csv-cancel').addEventListener('click', () => {
        rawFileContent = null;
        parsedCsvData = null;
        document.getElementById('csv-preview').style.display = 'none';
        document.getElementById('csv-result').textContent = '';
        fileInput.value = '';
    });

    document.getElementById('btn-csv-import').addEventListener('click', () => {
        if (!rawFileContent) return;
        const type = document.getElementById('csv-type').value;
        const resultEl = document.getElementById('csv-result');
        try {
            const count = parseAndImport(rawFileContent, type);
            resultEl.className = 'gfit-result success';
            resultEl.textContent = `✓ ${count} entrée(s) importée(s)`;
            document.getElementById('csv-preview').style.display = 'none';
            rawFileContent = null;
            fileInput.value = '';
        } catch (e) {
            resultEl.className = 'gfit-result error';
            resultEl.textContent = `Erreur : ${e.message}`;
        }
    });

    function parseCSV(text) {
        const lines = text.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        return lines.slice(1).filter(l => l.trim()).map(line => {
            const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
            const obj = {};
            headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
            return obj;
        });
    }

    function parseAndImport(content, type) {
        // JSON interne
        if (type === 'auto' || content.trim().startsWith('{') || content.trim().startsWith('[')) {
            return importJSON(content);
        }

        const rows = parseCSV(content);
        if (!rows.length) throw new Error('Fichier vide ou mal formaté');

        if (type === 'poids') return importCSVPoids(rows);
        if (type === 'sommeil') return importCSVSommeil(rows);
        if (type === 'seances') return importCSVSeances(rows);
        if (type === 'repas') return importCSVRepas(rows);
        if (type === 'samsung-sleep') return importSamsungSleep(rows);
        if (type === 'samsung-exercise') return importSamsungExercise(rows);
        if (type === 'garmin-sleep') return importGarminSleep(rows);
        if (type === 'garmin-activity') return importGarminActivity(rows);

        throw new Error('Type de fichier non reconnu');
    }

    // ── Parsers CSV génériques ───────────────────────────────

    function importCSVPoids(rows) {
        const history = loadData('bodyHistory');
        let count = 0;
        for (const r of rows) {
            if (!r.date || !r.poids) continue;
            if (history.find(h => h.date === r.date)) continue;
            history.push({ date: r.date, poids: parseFloat(r.poids) || 0, tourTaille: parseFloat(r.tourTaille) || 0 });
            count++;
        }
        if (count > 0) saveData('bodyHistory', history);
        return count;
    }

    function importCSVSommeil(rows) {
        const data = loadData('sommeilData');
        let count = 0;
        for (const r of rows) {
            if (!r.date) continue;
            if (data.find(s => s.date === r.date)) continue;
            data.push({
                date: r.date,
                tempsTotal: parseFloat(r.tempsTotal) || 0,
                rem: parseFloat(r.rem) || 0,
                profond: parseFloat(r.profond) || 0,
                leger: parseFloat(r.leger) || 0,
                bpm: parseFloat(r.bpm) || 0,
                oxygen: parseFloat(r.oxygen) || 0,
                apnee: parseFloat(r.apnee) || 0
            });
            count++;
        }
        if (count > 0) saveData('sommeilData', data);
        return count;
    }

    function importCSVSeances(rows) {
        const data = loadData('seanceData');
        let count = 0;
        for (const r of rows) {
            if (!r.date) continue;
            data.push({
                date: r.date,
                type: r.type || 'autre',
                duree: parseFloat(r.duree) || 0,
                kcal: parseFloat(r.kcal) || 0,
                ressenti: parseInt(r.ressenti) || 3,
                exercices: r.exercices || ''
            });
            count++;
        }
        if (count > 0) saveData('seanceData', data);
        return count;
    }

    function importCSVRepas(rows) {
        const data = loadData('repasData');
        let count = 0;
        for (const r of rows) {
            if (!r.date) continue;
            data.push({
                date: r.date,
                type: r.type || 'dejeuner',
                aliments: r.aliments || '',
                calories: parseFloat(r.calories) || 0,
                proteines: parseFloat(r.proteines) || 0,
                glucides: parseFloat(r.glucides) || 0,
                lipides: parseFloat(r.lipides) || 0
            });
            count++;
        }
        if (count > 0) saveData('repasData', data);
        return count;
    }

    // ── Parsers Samsung Health ───────────────────────────────

    function importSamsungSleep(rows) {
        // Samsung Health sleep_stage CSV
        // Colonnes: Start time, End time, Sleep type (1=awake,2=REM,3=light,4=deep), Duration
        const grouped = {};
        for (const r of rows) {
            const date = (r['Start time'] || r['start_time'] || '').split(' ')[0];
            if (!date) continue;
            if (!grouped[date]) grouped[date] = { rem: 0, profond: 0, leger: 0, tempsTotal: 0 };
            const dur = parseFloat(r['Duration'] || r['duration'] || 0);
            const type = parseInt(r['Sleep type'] || r['sleep_type'] || 0);
            grouped[date].tempsTotal += dur;
            if (type === 2) grouped[date].rem += dur;
            else if (type === 4) grouped[date].profond += dur;
            else if (type === 3) grouped[date].leger += dur;
        }
        const data = loadData('sommeilData');
        let count = 0;
        for (const [date, vals] of Object.entries(grouped)) {
            if (data.find(s => s.date === date)) continue;
            data.push({ date, ...vals, bpm: 0, oxygen: 0, apnee: 0 });
            count++;
        }
        if (count > 0) saveData('sommeilData', data);
        return count;
    }

    function importSamsungExercise(rows) {
        const data = loadData('seanceData');
        let count = 0;
        for (const r of rows) {
            const date = (r['Start time'] || r['start_time'] || '').split(' ')[0];
            if (!date) continue;
            const actType = r['Exercise type'] || r['exercise_type'] || '';
            let type = 'autre';
            if (/run|jog/i.test(actType)) type = 'cardio';
            else if (/weight|musc/i.test(actType)) type = 'musculation';
            else if (/yoga/i.test(actType)) type = 'yoga';
            else if (/hiit/i.test(actType)) type = 'hiit';
            data.push({
                date,
                type,
                duree: Math.round(parseFloat(r['Duration'] || r['duration'] || 0)),
                kcal: Math.round(parseFloat(r['Calorie'] || r['calorie'] || r['calories'] || 0)),
                ressenti: 3,
                exercices: actType
            });
            count++;
        }
        if (count > 0) saveData('seanceData', data);
        return count;
    }

    // ── Parsers Garmin ───────────────────────────────────────

    function importGarminSleep(rows) {
        const data = loadData('sommeilData');
        let count = 0;
        for (const r of rows) {
            const date = r['Date'] || r['date'] || '';
            if (!date) continue;
            if (data.find(s => s.date === date)) continue;
            const toMin = v => Math.round(parseFloat(v || 0) / 60);
            data.push({
                date,
                tempsTotal: toMin(r['Total Sleep Time (seconds)'] || r['total_sleep_seconds']),
                rem: toMin(r['REM Sleep Time (seconds)'] || r['rem_sleep_seconds']),
                profond: toMin(r['Deep Sleep Time (seconds)'] || r['deep_sleep_seconds']),
                leger: toMin(r['Light Sleep Time (seconds)'] || r['light_sleep_seconds']),
                bpm: Math.round(parseFloat(r['Average Resting Heart Rate'] || 0)),
                oxygen: Math.round(parseFloat(r['Average SpO2'] || 0)),
                apnee: 0
            });
            count++;
        }
        if (count > 0) saveData('sommeilData', data);
        return count;
    }

    function importGarminActivity(rows) {
        const data = loadData('seanceData');
        let count = 0;
        for (const r of rows) {
            const date = (r['Date'] || r['date'] || '').split(' ')[0];
            if (!date) continue;
            const actType = r['Activity Type'] || r['activity_type'] || '';
            let type = 'autre';
            if (/run|trail/i.test(actType)) type = 'cardio';
            else if (/strength|weight/i.test(actType)) type = 'musculation';
            else if (/yoga/i.test(actType)) type = 'yoga';
            else if (/hiit/i.test(actType)) type = 'hiit';
            else if (/cycling|bike/i.test(actType)) type = 'cardio';
            const durStr = r['Time'] || r['duration'] || '0:00:00';
            const parts = durStr.split(':').map(Number);
            const durMin = parts.length === 3 ? parts[0] * 60 + parts[1] : parseFloat(durStr) || 0;
            data.push({
                date,
                type,
                duree: Math.round(durMin),
                kcal: Math.round(parseFloat(r['Calories'] || r['calories'] || 0)),
                ressenti: 3,
                exercices: r['Title'] || r['title'] || actType
            });
            count++;
        }
        if (count > 0) saveData('seanceData', data);
        return count;
    }

    // ── Import JSON interne ──────────────────────────────────

    function importJSON(content) {
        let parsed;
        try { parsed = JSON.parse(content); } catch { throw new Error('JSON invalide'); }

        const keys = ['bodyHistory', 'bodySettings', 'sommeilData', 'repasData', 'seanceData'];
        let count = 0;

        if (parsed.bodyHistory || parsed.sommeilData || parsed.repasData || parsed.seanceData) {
            // Format export complet
            for (const key of keys) {
                if (!parsed[key]) continue;
                if (key === 'bodySettings') {
                    localStorage.setItem(key, JSON.stringify(parsed[key]));
                } else {
                    const existing = loadData(key);
                    const incoming = Array.isArray(parsed[key]) ? parsed[key] : [];
                    const merged = [...existing];
                    for (const item of incoming) {
                        if (!merged.find(e => e.date === item.date)) { merged.push(item); count++; }
                    }
                    saveData(key, merged);
                }
            }
        } else {
            throw new Error('Format JSON non reconnu. Exporte d\'abord depuis cette application.');
        }
        return count;
    }

    // ============================================================
    //  EXPORT
    // ============================================================

    document.querySelectorAll('.btn-export').forEach(btn => {
        btn.addEventListener('click', () => {
            const format = btn.getAttribute('data-format');
            if (format === 'json') exportJSON();
            else if (format === 'csv-poids') exportCSV('bodyHistory', ['date', 'poids', 'tourTaille'], 'poids');
            else if (format === 'csv-sommeil') exportCSV('sommeilData', ['date', 'tempsTotal', 'rem', 'profond', 'leger', 'bpm', 'oxygen', 'apnee'], 'sommeil');
            else if (format === 'csv-seances') exportCSV('seanceData', ['date', 'type', 'duree', 'kcal', 'ressenti', 'exercices'], 'seances');
            else if (format === 'csv-repas') exportCSV('repasData', ['date', 'type', 'aliments', 'calories', 'proteines', 'glucides', 'lipides'], 'repas');
        });
    });

    function exportJSON() {
        const payload = {
            exportDate: new Date().toISOString(),
            bodySettings: JSON.parse(localStorage.getItem('bodySettings') || 'null'),
            bodyHistory: loadData('bodyHistory'),
            sommeilData: loadData('sommeilData'),
            repasData: loadData('repasData'),
            seanceData: loadData('seanceData')
        };
        downloadFile(JSON.stringify(payload, null, 2), `suivi-sportif-${today()}.json`, 'application/json');
    }

    function exportCSV(key, fields, name) {
        const data = loadData(key);
        if (!data.length) { alert('Aucune donnée à exporter'); return; }
        const header = fields.join(',');
        const rows = data.map(r => fields.map(f => `"${(r[f] ?? '').toString().replace(/"/g, '""')}"`).join(','));
        downloadFile([header, ...rows].join('\n'), `${name}-${today()}.csv`, 'text/csv');
    }

    function downloadFile(content, filename, mime) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([content], { type: mime }));
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
    }

    function today() {
        return new Date().toISOString().split('T')[0];
    }
});
