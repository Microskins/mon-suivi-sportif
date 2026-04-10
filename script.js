document.addEventListener('DOMContentLoaded', function() {
    // Gestion des onglets
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', async () => {
            const tabId = button.getAttribute('data-tab');

            // Masquer tous les onglets et désactiver les boutons
            tabContents.forEach(content => content.classList.remove('active'));
            tabButtons.forEach(btn => btn.classList.remove('active'));

            // Afficher l'onglet sélectionné et activer le bouton
            const tabContent = document.getElementById(tabId);
            tabContent.classList.add('active');
            button.classList.add('active');

            // Charger dynamiquement le contenu de l'onglet si ce n'est pas l'accueil
            if (tabId !== 'accueil' && !tabContent.querySelector('.onglet-content')) {
                const response = await fetch(`${tabId}/${tabId}.html`);
                const html = await response.text();
                tabContent.innerHTML = html;

                // Charger le script JS associé à l'onglet
                const script = document.createElement('script');
                script.src = `${tabId}/${tabId}.js`;
                tabContent.appendChild(script);
            }
        });
    });

    // Charger le graphique récapitulatif
    updateRecapChart();

    // Fonction pour mettre à jour le graphique récapitulatif
    function updateRecapChart() {
        const ctx = document.getElementById('recapChart').getContext('2d');

        // Récupérer les données depuis localStorage
        const sommeilData = JSON.parse(localStorage.getItem('sommeilData')) || [];
        const repasData = JSON.parse(localStorage.getItem('repasData')) || [];
        const seanceData = JSON.parse(localStorage.getItem('seanceData')) || [];
        const bodyData = JSON.parse(localStorage.getItem('bodyData')) || {};

        // Préparer les données pour le graphique
        const dates = [...new Set([
            ...sommeilData.map(s => s.date),
            ...repasData.map(r => r.date),
            ...seanceData.map(s => s.date)
        ])].sort();

        const kcalData = dates.map(date => {
            const repas = repasData.find(r => r.date === date);
            const cardio = seanceData.find(s => s.type === 'cardio' && s.date === date);
            const kcalRepas = repas ? parseInt(repas.calories) || 0 : 0;
            const kcalCardio = cardio ? parseInt(cardio.kcal) || 0 : 0;
            return kcalRepas - kcalCardio;
        });

        const poidsData = dates.map(() => bodyData.poids || 111);

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [
                    {
                        label: 'Bilan Calorique (kcal)',
                        data: kcalData,
                        borderColor: 'rgb(75, 192, 192)',
                        tension: 0.1
                    },
                    {
                        label: 'Poids (kg)',
                        data: poidsData,
                        borderColor: 'rgb(255, 99, 132)',
                        tension: 0.1
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: false
                    }
                }
            }
        });
    }

    // Fonction pour sauvegarder les données dans localStorage
    window.saveData = function(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
        updateRecapChart(); // Mettre à jour le graphique après sauvegarde
    };

    // Fonction pour charger les données depuis localStorage
    window.loadData = function(key) {
        return JSON.parse(localStorage.getItem(key)) || [];
    };
});