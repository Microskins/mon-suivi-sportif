// ============================================================
//  SCRIPT.JS — Onglets + graphique récapitulatif + utilitaires
//  Tout le HTML est inline dans index.html (pas de fetch)
// ============================================================

document.addEventListener('DOMContentLoaded', function () {

    // ── Gestion des onglets ──────────────────────────────────
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');

            tabContents.forEach(c => c.classList.remove('active'));
            tabButtons.forEach(b => b.classList.remove('active'));

            document.getElementById(tabId).classList.add('active');
            button.classList.add('active');

            if (tabId === 'accueil') updateRecapChart();
        });
    });

    // ── Graphique récapitulatif ──────────────────────────────
    let recapChart = null;

    function updateRecapChart() {
        const wrapper = document.getElementById('recapChartWrapper');
        const sommeilData  = JSON.parse(localStorage.getItem('sommeilData'))  || [];
        const repasData    = JSON.parse(localStorage.getItem('repasData'))    || [];
        const seanceData   = JSON.parse(localStorage.getItem('seanceData'))   || [];
        const bodyHistory  = JSON.parse(localStorage.getItem('bodyHistory'))  || [];

        const dateSet = new Set([
            ...sommeilData.map(s => s.date),
            ...repasData.map(r => r.date),
            ...seanceData.map(s => s.date),
            ...bodyHistory.map(b => b.date)
        ]);
        const dates = [...dateSet].sort();

        if (dates.length === 0) {
            if (recapChart) { recapChart.destroy(); recapChart = null; }
            wrapper.innerHTML = '<p style="text-align:center;color:#888;padding:40px">Aucune donnée à afficher. Commencez par saisir des données dans les onglets.</p>';
            return;
        }

        // Recréer le canvas si nécessaire
        if (!wrapper.querySelector('canvas')) {
            wrapper.innerHTML = '<canvas id="recapChart"></canvas>';
        }
        const ctx = document.getElementById('recapChart').getContext('2d');

        const kcalData = dates.map(date => {
            const kcalRepas    = repasData.filter(r => r.date === date).reduce((s, r) => s + (r.calories || 0), 0);
            const kcalBrulees  = seanceData.filter(s => s.date === date).reduce((s, r) => s + (r.kcal || 0), 0);
            return kcalRepas - kcalBrulees;
        });

        const poidsData = dates.map(date => {
            const entry = [...bodyHistory].reverse().find(b => b.date <= date);
            return entry ? entry.poids : null;
        });

        const sommeilHeures = dates.map(date => {
            const s = sommeilData.find(s => s.date === date);
            return s?.tempsTotal ? Math.round((s.tempsTotal / 60) * 10) / 10 : null;
        });

        if (recapChart) recapChart.destroy();

        recapChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [
                    {
                        label: 'Bilan calorique (kcal)',
                        data: kcalData,
                        borderColor: 'rgb(75, 192, 192)',
                        backgroundColor: 'rgba(75, 192, 192, 0.1)',
                        tension: 0.3,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Poids (kg)',
                        data: poidsData,
                        borderColor: 'rgb(255, 99, 132)',
                        backgroundColor: 'rgba(255, 99, 132, 0.1)',
                        tension: 0.3,
                        spanGaps: true,
                        yAxisID: 'y1'
                    },
                    {
                        label: 'Sommeil (h)',
                        data: sommeilHeures,
                        borderColor: 'rgb(153, 102, 255)',
                        backgroundColor: 'rgba(153, 102, 255, 0.1)',
                        tension: 0.3,
                        spanGaps: true,
                        yAxisID: 'y2'
                    }
                ]
            },
            options: {
                responsive: true,
                interaction: { mode: 'index', intersect: false },
                plugins: { legend: { position: 'top' } },
                scales: {
                    y:  { type: 'linear', position: 'left',  title: { display: true, text: 'kcal' } },
                    y1: { type: 'linear', position: 'right', title: { display: true, text: 'kg' },  grid: { drawOnChartArea: false } },
                    y2: { display: false }
                }
            }
        });
    }

    // ── Utilitaires globaux ──────────────────────────────────

    window.saveData = function (key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    };

    window.loadData = function (key) {
        try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; }
    };

    window.showFeedback = function (container, message, type = 'success') {
        const el = document.createElement('div');
        el.className = `feedback feedback-${type}`;
        el.textContent = message;
        container.appendChild(el);
        setTimeout(() => el.remove(), 3000);
    };

    // Initialiser le graphique au démarrage
    updateRecapChart();
});
