document.addEventListener('DOMContentLoaded', function () {

    // ── Données des plans ─────────────────────────────────────────────────────

    const ACTIVITY_LEVELS = [
        { label: 'Sédentaire (peu/pas de sport)',         mult: 1.10 },
        { label: 'Légèrement actif (1-2×/semaine)',       mult: 1.20 },
        { label: 'Modérément actif (3-4×/semaine)',       mult: 1.35 },
        { label: 'Très actif (5×/semaine)',               mult: 1.45 },
        { label: 'Extrêmement actif (2×/jour)',           mult: 1.60 },
        { label: 'Athlète professionnel',                 mult: 1.70 },
        { label: 'Compétition',                           mult: 1.80 },
    ];

    const PLANS = {
        seche: {
            label: 'Sèche',
            weeks: [
                { kcalT: 3335, kcalR: 2835, prot: 159, glucT: 466, glucR: 336, lipT: 93, lipR: 95 },
                { kcalT: 3335, kcalR: 2835, prot: 159, glucT: 466, glucR: 336, lipT: 93, lipR: 95 },
                { kcalT: 3169, kcalR: 2835, prot: 159, glucT: 433, glucR: 336, lipT: 89, lipR: 95 },
                { kcalT: 3002, kcalR: 2835, prot: 159, glucT: 403, glucR: 336, lipT: 84, lipR: 95 },
            ]
        },
        masse: {
            label: 'Prise de masse',
            weeks: [
                { kcalT: 3669, kcalR: 3335, prot: 159, glucT: 529, glucR: 423, lipT: 102, lipR: 112 },
                { kcalT: 3669, kcalR: 3335, prot: 159, glucT: 529, glucR: 423, lipT: 102, lipR: 112 },
                { kcalT: 3836, kcalR: 3335, prot: 159, glucT: 560, glucR: 423, lipT: 107, lipR: 112 },
                { kcalT: 4002, kcalR: 3335, prot: 159, glucT: 590, glucR: 423, lipT: 112, lipR: 112 },
            ]
        }
    };

    // ── Calculs BMR ───────────────────────────────────────────────────────────

    function getLatestBodyFat() {
        try {
            const settings = loadData('bodySettings', null);
            const mensData = loadData('mensurationsData');
            if (!settings?.taille || !mensData.length) return null;
            const last = [...mensData].sort((a, b) => b.date.localeCompare(a.date))[0];
            const { taille } = settings;
            const { cou, tailleMens, hanches } = last;
            const profiles = JSON.parse(localStorage.getItem('profiles') || '[]');
            const currentId = localStorage.getItem('currentProfileId');
            const sexe = profiles.find(p => p.id === currentId)?.sexe || 'homme';
            if (!taille || !cou || !tailleMens) return null;
            if (sexe === 'femme' && !hanches) return null;
            if (tailleMens <= cou) return null;
            let taux;
            if (sexe === 'femme') {
                if (tailleMens + hanches - cou <= 0) return null;
                taux = 495 / (1.34803 - 0.35004 * Math.log10(tailleMens + hanches - cou) + 0.22100 * Math.log10(taille)) - 450;
            } else {
                taux = 495 / (1.04706 - 0.19077 * Math.log10(tailleMens - cou) + 0.15456 * Math.log10(taille)) - 450;
            }
            if (taux < 2 || taux > 70) return null;
            return Math.round(taux * 10) / 10;
        } catch { return null; }
    }

    function computeBMR() {
        const settings = loadData('bodySettings', null);
        if (!settings?.poids) return null;
        const tauxGras = getLatestBodyFat();
        if (tauxGras === null) return null;
        const masseMaigre = settings.poids * (1 - tauxGras / 100);
        return { bmr: Math.round(370 + 21.6 * masseMaigre), masseMaigre: Math.round(masseMaigre * 10) / 10, tauxGras };
    }

    // ── Rendu BMR + maintenance ───────────────────────────────────────────────

    function renderBMR() {
        const el = document.getElementById('nutritionBMR');
        if (!el) return;

        const result = computeBMR();
        if (!result) {
            el.innerHTML = `<div class="nutri-missing">
                <p>Pour calculer ton BMR, renseigne ton <strong>poids</strong> dans l'onglet Body et enregistre des <strong>mensurations</strong> (cou + tour de taille) pour obtenir le taux de gras.</p>
            </div>`;
            return;
        }

        const { bmr, masseMaigre, tauxGras } = result;
        const sel = document.getElementById('activitySelect');
        const mult = sel ? parseFloat(sel.value) : 1.35;
        const maintenance = Math.round(bmr * mult);

        el.innerHTML = `
            <div class="nutri-bmr-cards">
                <div class="nutri-card">
                    <div class="nutri-card-label">Taux de gras</div>
                    <div class="nutri-card-value">${tauxGras}%</div>
                </div>
                <div class="nutri-card">
                    <div class="nutri-card-label">Masse maigre</div>
                    <div class="nutri-card-value">${masseMaigre} kg</div>
                </div>
                <div class="nutri-card nutri-card--accent">
                    <div class="nutri-card-label">BMR (Katch-McArdle)</div>
                    <div class="nutri-card-value">${bmr} kcal</div>
                </div>
                <div class="nutri-card nutri-card--primary">
                    <div class="nutri-card-label">Maintenance</div>
                    <div class="nutri-card-value">${maintenance} kcal</div>
                </div>
            </div>`;
    }

    // ── Rendu du plan 4 semaines ──────────────────────────────────────────────

    function renderPlan() {
        const wrap = document.getElementById('nutritionPlanWrap');
        const activeType = document.querySelector('.plan-type-btn.active')?.dataset.plan;
        if (!wrap || !activeType) return;

        const plan = PLANS[activeType];
        const activePlanData = loadData('nutritionPlan', null);
        const isActive = activePlanData?.type === activeType;

        wrap.innerHTML = `
            <div class="nutri-plan-header">
                <h3>Plan ${plan.label} — 4 semaines</h3>
                <button class="btn-activate-plan ${isActive ? 'active' : ''}" id="btnActivatePlan">
                    ${isActive ? '✓ Plan actif' : 'Activer ce plan'}
                </button>
            </div>
            <div class="table-wrap">
            <table class="nutri-plan-table">
                <thead>
                    <tr>
                        <th>Semaine</th>
                        <th>Jour</th>
                        <th>Calories</th>
                        <th>Protéines</th>
                        <th>Glucides</th>
                        <th>Lipides</th>
                    </tr>
                </thead>
                <tbody>
                    ${plan.weeks.map((w, i) => `
                        <tr class="nutri-week-row nutri-training">
                            <td rowspan="2"><strong>S${i + 1}</strong></td>
                            <td><span class="day-badge training">Training</span></td>
                            <td>${w.kcalT} kcal</td>
                            <td>${w.prot} g</td>
                            <td>${w.glucT} g</td>
                            <td>${w.lipT} g</td>
                        </tr>
                        <tr class="nutri-week-row nutri-repos">
                            <td><span class="day-badge repos">Repos</span></td>
                            <td>${w.kcalR} kcal</td>
                            <td>${w.prot} g</td>
                            <td>${w.glucR} g</td>
                            <td>${w.lipR} g</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            </div>`;

        document.getElementById('btnActivatePlan')?.addEventListener('click', () => {
            const plan = { type: activeType, startDate: new Date().toISOString().split('T')[0], week: 1 };
            saveData('nutritionPlan', plan);
            renderPlan();
            showFeedback(document.getElementById('nutritionFeedback'), 'Plan activé ! Il sera affiché dans l\'onglet Repas.');
        });
    }

    // ── Init ──────────────────────────────────────────────────────────────────

    const activitySelect = document.getElementById('activitySelect');
    if (activitySelect) {
        ACTIVITY_LEVELS.forEach(a => {
            const opt = document.createElement('option');
            opt.value = a.mult;
            opt.textContent = `${a.label} (×${a.mult})`;
            if (a.mult === 1.35) opt.selected = true;
            activitySelect.appendChild(opt);
        });
        activitySelect.addEventListener('change', renderBMR);
    }

    document.querySelectorAll('.plan-type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.plan-type-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderPlan();
        });
    });

    renderBMR();
    renderPlan();

    window.addEventListener('suivi:dataChanged', () => { renderBMR(); renderPlan(); });
});
