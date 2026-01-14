# Forem Explorer

🔍 **Application web de recherche d'emploi** pour explorer les offres du Forem (Service public de l'emploi en Belgique) via leur API Open Data.

> ⚠️ **Important** : Ce projet a été réalisé en *vibe coding* avec l'assistance de divers LLM. Le code peut contenir des imperfections, des bugs ou des choix d'architecture discutables. L'objectif est de concevoir un prototype fonctionnel rapidement pour m'aider dans ma recherche d'emploi. Utilisez-le à vos risques et périls.

## ✨ Fonctionnalités

### 🔎 Recherche avancée
- Recherche par mots-clés avec exclusions (`-mot` ou `-"phrase exacte"`)
- Filtres par secteur (ROME), localisation, type de contrat, régime de travail
- Recherche géolocalisée avec calcul de distance
- Sauvegarde des recherches favorites

### 👤 Profil CV
- Import de CV au format JSON (compatible [Reactive Resume](https://rxresu.me/))
- Gestion des compétences, expériences, formations et langues
- Support multi-profils

### 🤖 Intelligence Artificielle (Gemini)
- **Scoring IA** : analyse de compatibilité entre votre profil et les offres
- **Lettres de motivation** : génération automatique personnalisée (3 styles : formel, équilibré, dynamique)
- Cache des réponses pour optimiser l'utilisation

### 📊 Suivi des candidatures
- Favoris et marquage "postulé"
- Notes personnelles sur chaque offre
- Tags personnalisés
- Dashboard avec statistiques et graphiques

### 💾 Gestion des données
- Export/Import des données (favoris, notes, lettres)
- Chiffrement optionnel des données sensibles (clé API)
- Stockage local (localStorage)

## 🚀 Démarrage

### Prérequis
- Un navigateur web moderne
- (Optionnel) Une clé API Google Gemini pour les fonctionnalités IA

### Installation

1. Clonez le repository :
```bash
git clone https://github.com/DesignThinkerer/forem-explorer.git
cd forem-explorer
```

2. Ouvrez `index.html` dans votre navigateur ou utilisez un serveur local :
```bash
# Avec Python
python -m http.server 8000

# Avec Node.js
npx serve
```

3. (Optionnel) Configurez votre clé API Gemini dans **IA > Paramètres**

## 📁 Structure du projet

```
forem-explorer/
├── index.html          # Page de recherche principale
├── profile.html        # Gestion du profil CV
├── letters.html        # Lettres de motivation sauvegardées
├── dashboard.html      # Statistiques et suivi
├── settings.html       # Paramètres IA (Gemini)
├── aide.html           # Guide d'utilisation
├── css/
│   └── styles.css      # Styles personnalisés
└── js/
    ├── components/     # Web Components (nav-bar, footer-bar)
    ├── app.js          # Point d'entrée principal
    ├── search.js       # Logique de recherche
    ├── cv-*.js         # Gestion du profil CV
    ├── gemini-*.js     # Intégration Gemini AI
    ├── ai-*.js         # Scoring et lettres IA
    └── ...             # Autres modules
```

## 🛠️ Technologies

- **Frontend** : HTML5, JavaScript (ES Modules), Web Components
- **Styles** : [Tailwind CSS](https://tailwindcss.com/) (CDN)
- **Icônes** : [Lucide](https://lucide.dev/)
- **Graphiques** : [Chart.js](https://www.chartjs.org/)
- **Export PDF** : [html2pdf.js](https://ekoopmans.github.io/html2pdf.js/)
- **IA** : [Google Gemini API](https://ai.google.dev/)

## 📄 Licence

Ce projet est open source.

## 🔗 Liens

- [API Open Data du Forem](https://www.leforem.be/opendata)
- [Reactive Resume](https://rxresu.me/) - Pour créer votre CV JSON