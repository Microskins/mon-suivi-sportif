# Mon Suivi Sportif 🏋️‍♂️

**Mon Suivi Sportif** est une application web locale conçue pour t'aider à suivre tes performances physiques, ton sommeil, tes repas et tes séances de sport. Elle te permet de visualiser tes progrès grâce à des graphiques et des tableaux récapitulatifs.

---

## 📌 Objectifs du projet

- **Suivre tes données corporelles** (poids, tour de taille, taille, IMC).
- **Analyser ton sommeil** (apnée, phases REM, sommeil profond/léger, BPM, oxygène sanguin).
- **Enregistrer tes repas** (calories, protéines, glucides, lipides).
- **Suivre tes séances de sport** (musculation, cardio) avec calcul automatique des calories brûlées.
- **Visualiser tes progrès** grâce à un graphique récapitulatif sur la page d'accueil.

---

## 📂 Structure du projet

```
/mon-suivi-sportif/
├── index.html              # Page principale avec les onglets et le graphique récapitulatif
├── style.css               # Styles CSS communs
├── script.js               # Logique commune (gestion des onglets, graphique récapitulatif)
├── body/
│   ├── body.html           # Contenu HTML de l'onglet Body
│   └── body.js             # Logique JS de l'onglet Body
├── sommeil/
│   ├── sommeil.html        # Contenu HTML de l'onglet Sommeil
│   └── sommeil.js          # Logique JS de l'onglet Sommeil
├── repas/
│   ├── repas.html          # Contenu HTML de l'onglet Repas
│   └── repas.js            # Logique JS de l'onglet Repas
└── seances/
    ├── seances.html        # Contenu HTML de l'onglet Séances
    └── seances.js          # Logique JS de l'onglet Séances
```

---

## 🛠 Installation et utilisation

### Prérequis

- Un navigateur web moderne (Chrome, Firefox, Edge, etc.).
- Un éditeur de code (VS Code, Sublime Text, etc.) pour modifier les fichiers si nécessaire.

### Étapes pour utiliser l'application

1. **Télécharger le projet** :
  - Clone ce dépôt ou télécharge les fichiers dans un dossier sur ton ordinateur.
2. **Ouvrir l'application** :
  - Ouvre le fichier `index.html` dans ton navigateur (en utilisant un serveur local comme [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) pour éviter les problèmes de CORS).
3. **Utiliser les onglets** :
  - **Accueil** : Graphique récapitulatif de tes données (poids, bilan calorique).
  - **Body** : Enregistre tes données corporelles (poids, tour de taille, taille, âge).
  - **Sommeil** : Enregistre tes données de sommeil (phases, BPM, oxygène sanguin).
  - **Repas** : Enregistre tes repas (calories, protéines, glucides, lipides).
  - **Séances** : Enregistre tes séances de musculation ou de cardio.

---

## 📊 Fonctionnalités par onglet

### **1. Onglet "Body"**

- **Enregistrer** : Poids, tour de taille, taille, date de naissance.
- **Afficher** : IMC calculé automatiquement, âge, et toutes les données corporelles.

### **2. Onglet "Sommeil"**

- **Enregistrer** : Date, durée des phases de sommeil (REM, profond, léger), apnée, BPM, oxygène sanguin.
- **Afficher** : Tableau récapitulatif de toutes tes nuits enregistrées.

### **3. Onglet "Repas"**

- **Enregistrer** : Date, calories, protéines, glucides, lipides.
- **Afficher** : Tableau récapitulatif de tous tes repas enregistrés.

### **4. Onglet "Séances"**

- **Enregistrer** :
  - **Musculation** : Exercice, répétitions, poids.
  - **Cardio** : Type (tapis/extérieur), temps, vitesse moyenne, distance, calories brûlées (calcul automatique).
- **Afficher** : Tableau récapitulatif de toutes tes séances.

---

## 📈 Graphique récapitulatif

- **Sur la page d'accueil**, un graphique affiche :
  - **Bilan calorique** (calories consommées - calories brûlées).
  - **Poids** (en kg).
- Les données sont mises à jour automatiquement après chaque enregistrement.

---

## 🔧 Personnalisation

- **Ajouter des fonctionnalités** : Tu peux facilement ajouter de nouveaux champs ou graphiques en modifiant les fichiers HTML/JS correspondants.
- **Exporter/Importer les données** : Les données sont stockées dans `localStorage`. Tu peux les exporter/importer en ajoutant une fonctionnalité dédiée.

---

## 💡 Idées d'améliorations futures

- **Synchronisation avec un serveur** : Pour sauvegarder tes données en ligne.
- **Notifications** : Rappels pour enregistrer tes données quotidiennement.
- **Objectifs** : Définir des objectifs (poids, calories, etc.) et suivre tes progrès.
- **Analyse avancée** : Statistiques et tendances sur le long terme.

---

## 📄 Licence

Ce projet est sous licence **MIT**. Tu es libre de l'utiliser, le modifier et le partager comme tu le souhaites.

---

## 🙌 Remerciements

Merci d'utiliser **Mon Suivi Sportif** ! Si tu as des questions, des suggestions ou des problèmes, n'hésite pas à me contacter.

---

**Bon suivi sportif !** 💪