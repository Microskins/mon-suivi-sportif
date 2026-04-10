document.addEventListener('DOMContentLoaded', function() {
    const bodyForm = document.getElementById('bodyForm');
    const bodyDataDisplay = document.getElementById('bodyDataDisplay');

    // Charger et afficher les données Body
    function loadAndDisplayBodyData() {
        const bodyData = loadData('bodyData');
        if (bodyData.poids) {
            const imc = (bodyData.poids / Math.pow(bodyData.taille / 100, 2)).toFixed(2);
            const age = calculateAge(bodyData.age);
            bodyDataDisplay.innerHTML = `
                <h3>Mes données corporelles</h3>
                <p><strong>Poids :</strong> ${bodyData.poids} kg</p>
                <p><strong>Tour de taille :</strong> ${bodyData.tourTaille} cm</p>
                <p><strong>Taille :</strong> ${bodyData.taille} cm</p>
                <p><strong>Âge :</strong> ${age} ans</p>
                <p><strong>IMC :</strong> ${imc}</p>
            `;
        }
    }

    // Calculer l'âge à partir de la date de naissance
    function calculateAge(birthDate) {
        const birth = new Date(birthDate);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    }

    // Enregistrement des données Body
    bodyForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const bodyData = {
            poids: parseFloat(document.getElementById('poids').value),
            tourTaille: parseFloat(document.getElementById('tour-taille').value),
            taille: parseFloat(document.getElementById('taille').value),
            age: document.getElementById('age').value
        };
        saveData('bodyData', bodyData);
        loadAndDisplayBodyData();
        alert('Données Body enregistrées !');
    });

    // Charger les données Body au démarrage
    loadAndDisplayBodyData();
});