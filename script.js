// Exemple : Charger les données depuis un fichier JSON
fetch('data/suivi.json')
    .then(response => response.json())
    .then(data => {
        console.log(data); // Affiche les données dans la console
        // Ici, tu peux afficher les données dans la page
    });