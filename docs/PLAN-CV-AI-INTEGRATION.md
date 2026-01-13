# Plan d'intégration CV et IA pour FOREM Explorer

## Vue d'ensemble

Ce document décrit le plan détaillé pour intégrer le support de CV au format [Reactive Resume (rx-resume)](https://rxresu.me/) et l'intelligence artificielle Gemini pour améliorer l'expérience de recherche d'emploi.

### Objectifs

1. **Import de CV** : Permettre aux utilisateurs d'importer leur CV au format JSON rx-resume
2. **Matching intelligent** : Utiliser Gemini pour scorer la pertinence des offres selon le profil
3. **Génération de lettres** : Aider à rédiger des lettres de motivation personnalisées

---

## Phase 1 : Support du format rx-resume

### 1.1 Analyse du format rx-resume

Le format rx-resume est un JSON structuré contenant :

```json
{
  "basics": {
    "name": "string",
    "headline": "string",
    "email": "string",
    "phone": "string",
    "location": "string",
    "url": { "href": "string" },
    "summary": "string"
  },
  "sections": {
    "experience": {
      "items": [
        {
          "company": "string",
          "position": "string",
          "location": "string",
          "date": "string",
          "summary": "string"
        }
      ]
    },
    "education": {
      "items": [
        {
          "institution": "string",
          "studyType": "string",
          "area": "string",
          "date": "string",
          "summary": "string"
        }
      ]
    },
    "skills": {
      "items": [
        {
          "name": "string",
          "level": "number",
          "keywords": ["string"]
        }
      ]
    },
    "languages": {
      "items": [
        {
          "name": "string",
          "level": "string"
        }
      ]
    },
    "certifications": {
      "items": [...]
    },
    "projects": {
      "items": [...]
    }
  }
}
```

### 1.2 Fichiers à créer

| Fichier | Description |
|---------|-------------|
| `js/cv-parser.js` | Parser et validateur du format rx-resume |
| `js/cv-storage.js` | Gestion du stockage du CV dans localStorage |
| `js/cv-profile.js` | Extraction du profil candidat (compétences, expérience) |
| `profile.html` | Page de gestion du profil/CV |

### 1.3 Fonctionnalités

#### Import du CV
```
┌─────────────────────────────────────────────────────┐
│  📄 Mon Profil                                      │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │  Glissez votre fichier rx-resume.json ici   │   │
│  │              ou cliquez pour sélectionner   │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ─────────────────────────────────────────────────  │
│                                                     │
│  👤 Jean Dupont                                     │
│  📧 jean.dupont@email.com                          │
│  📍 Liège, Belgique                                │
│                                                     │
│  🎯 Compétences extraites:                         │
│  ┌─────────┐ ┌─────────┐ ┌──────────┐             │
│  │JavaScript│ │  React  │ │  Node.js │             │
│  └─────────┘ └─────────┘ └──────────┘             │
│                                                     │
│  💼 5 ans d'expérience en développement web        │
│  🎓 Master en Informatique                         │
│                                                     │
└─────────────────────────────────────────────────────┘
```

#### Structure de données normalisée

```javascript
// Profil candidat extrait du CV
const candidateProfile = {
  // Identité
  name: "string",
  email: "string",
  location: "string",
  
  // Compétences (normalisées)
  skills: [
    { name: "JavaScript", level: 4, category: "programming" },
    { name: "React", level: 3, category: "framework" },
    // ...
  ],
  
  // Expérience
  totalExperienceYears: 5,
  experienceByDomain: {
    "développement web": 4,
    "gestion de projet": 2
  },
  
  // Formation
  educationLevel: "master",
  educationFields: ["informatique", "génie logiciel"],
  
  // Langues
  languages: [
    { name: "Français", level: "native" },
    { name: "Anglais", level: "fluent" }
  ],
  
  // Mots-clés extraits (pour le matching)
  keywords: ["javascript", "react", "node", "api", "agile", ...]
};
```

### 1.4 Tâches de développement

- [ ] Créer le parser rx-resume avec validation JSON Schema
- [ ] Implémenter le stockage chiffré dans localStorage
- [ ] Créer l'interface d'import drag & drop
- [ ] Développer l'affichage du profil extrait
- [ ] Permettre l'édition manuelle des compétences
- [ ] Ajouter l'export du profil

---

## Phase 2 : Intégration Gemini API

### 2.1 Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│   Proxy     │────▶│  Gemini API │
│  (Browser)  │◀────│  (Optional) │◀────│   (Google)  │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                    ┌──────┴──────┐
                    │ Rate Limit  │
                    │ API Key Mgmt│
                    └─────────────┘
```

### 2.2 Options de déploiement

#### Option A : Clé API côté client (simple)
- L'utilisateur fournit sa propre clé API Gemini
- Stockée chiffrée dans localStorage
- Appels directs à l'API Gemini

**Avantages** : Simple, pas de backend
**Inconvénients** : Chaque utilisateur doit avoir une clé

#### Option B : Proxy backend (recommandé pour prod)
- Clé API centralisée côté serveur
- Rate limiting et quotas par utilisateur
- Possibilité de cache des réponses

### 2.3 Fichiers à créer

| Fichier | Description |
|---------|-------------|
| `js/gemini-client.js` | Client API Gemini avec gestion erreurs |
| `js/gemini-config.js` | Configuration et gestion clé API |
| `js/ai-matching.js` | Logique de scoring des offres |
| `js/ai-cover-letter.js` | Génération de lettres de motivation |

### 2.4 Configuration

```javascript
// js/gemini-config.js
const GEMINI_CONFIG = {
  model: "gemini-1.5-flash", // Rapide et économique
  maxTokens: 2048,
  temperature: 0.7,
  
  // Endpoints
  apiUrl: "https://generativelanguage.googleapis.com/v1beta/models",
  
  // Rate limiting côté client
  maxRequestsPerMinute: 15,
  maxRequestsPerDay: 100,
  
  // Cache
  cacheEnabled: true,
  cacheDuration: 24 * 60 * 60 * 1000 // 24h
};
```

### 2.5 Interface de configuration

```
┌─────────────────────────────────────────────────────┐
│  ⚙️ Configuration IA                                │
├─────────────────────────────────────────────────────┤
│                                                     │
│  🔑 Clé API Gemini                                  │
│  ┌─────────────────────────────────────────────┐   │
│  │ AIza••••••••••••••••••••••••••••••••       │   │
│  └─────────────────────────────────────────────┘   │
│  ℹ️ Obtenez votre clé sur ai.google.dev            │
│                                                     │
│  📊 Utilisation aujourd'hui: 12/100 requêtes       │
│  ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        │
│                                                     │
│  ┌─────────────────┐                               │
│  │ ✓ Tester la clé │                               │
│  └─────────────────┘                               │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## Phase 3 : Scoring intelligent des offres

### 3.1 Algorithme de matching

```
Score final = (Score compétences × 0.4) + 
              (Score expérience × 0.3) + 
              (Score localisation × 0.15) + 
              (Score formation × 0.15)
```

### 3.2 Workflow

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Profil CV   │───▶│   Analyse    │───▶│   Prompt     │
│  (rx-resume) │    │  Offre FOREM │    │   Gemini     │
└──────────────┘    └──────────────┘    └──────────────┘
                                               │
                                               ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Affichage   │◀───│   Parsing    │◀───│   Réponse    │
│  Score + UI  │    │   JSON       │    │   Gemini     │
└──────────────┘    └──────────────┘    └──────────────┘
```

### 3.3 Prompt de scoring

```javascript
const SCORING_PROMPT = `
Tu es un expert en recrutement. Analyse la correspondance entre ce profil candidat et cette offre d'emploi.

## Profil candidat
${JSON.stringify(candidateProfile, null, 2)}

## Offre d'emploi
Titre: ${job.title}
Entreprise: ${job.company}
Description: ${job.description}
Compétences requises: ${job.skills?.join(', ')}
Expérience requise: ${job.experience}
Localisation: ${job.location}

## Instructions
Réponds UNIQUEMENT avec un objet JSON valide (sans markdown, sans backticks):
{
  "score": <number 0-100>,
  "matchingSkills": ["skill1", "skill2"],
  "missingSkills": ["skill1", "skill2"],
  "experienceMatch": "excellent|good|partial|insufficient",
  "locationMatch": "exact|nearby|remote_possible|far",
  "summary": "<résumé de 2-3 phrases>",
  "recommendations": ["conseil1", "conseil2"]
}
`;
```

### 3.4 Interface utilisateur

#### Badge de score sur les cartes d'offres

```
┌─────────────────────────────────────────────────────┐
│ ┌─────┐                                             │
│ │ 87% │  Développeur Full Stack JavaScript         │
│ │ ██▓ │                                             │
│ └─────┘  TechCorp SA • Liège                       │
│                                                     │
│  ✓ JavaScript  ✓ React  ✓ Node.js  ✗ Python       │
│                                                     │
│  💡 Bonne correspondance! Vous avez 3/4 compétences│
│     requises. Considérez Python comme atout.       │
│                                                     │
└─────────────────────────────────────────────────────┘
```

#### Filtre par score

```
┌───────────────────────────────────────────┐
│  🎯 Pertinence minimum                    │
│  ○ Tous    ● 50%+    ○ 70%+    ○ 85%+    │
└───────────────────────────────────────────┘
```

### 3.5 Optimisations

- **Batch scoring** : Analyser plusieurs offres en une requête
- **Cache intelligent** : Stocker les scores par hash (profil + offre)
- **Scoring local d'abord** : Pré-filtrer avec des règles simples avant d'appeler Gemini
- **Score progressif** : Afficher un score approximatif immédiat, puis affiner avec l'IA

### 3.6 Tâches de développement

- [ ] Créer le client Gemini avec retry et rate limiting
- [ ] Implémenter le prompt de scoring
- [ ] Développer le parser de réponse JSON
- [ ] Créer le système de cache
- [ ] Ajouter le badge de score sur les cartes
- [ ] Implémenter le tri par pertinence
- [ ] Ajouter le filtre par score minimum
- [ ] Créer la vue détaillée du matching

---

## Phase 4 : Génération de lettres de motivation

### 4.1 Workflow utilisateur

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Consulter  │────▶│   Cliquer   │────▶│   Modal     │
│   offre     │     │  "Postuler" │     │   lettre    │
└─────────────┘     └─────────────┘     └─────────────┘
                                               │
                    ┌─────────────────────────┴─────┐
                    │                               │
                    ▼                               ▼
             ┌─────────────┐               ┌─────────────┐
             │  Générer    │               │   Écrire    │
             │  avec IA    │               │  manuellement│
             └─────────────┘               └─────────────┘
                    │
                    ▼
             ┌─────────────┐     ┌─────────────┐
             │   Éditer    │────▶│  Exporter   │
             │   lettre    │     │  PDF/Copier │
             └─────────────┘     └─────────────┘
```

### 4.2 Interface de génération

```
┌─────────────────────────────────────────────────────────────┐
│  ✉️ Lettre de motivation                              [X]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Pour: Développeur Full Stack @ TechCorp SA                 │
│                                                             │
│  🎨 Style de la lettre                                      │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐              │
│  │ Formel     │ │ Équilibré ✓│ │ Dynamique  │              │
│  └────────────┘ └────────────┘ └────────────┘              │
│                                                             │
│  🎯 Points à mettre en avant (optionnel)                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Mon expérience en startup, ma certification AWS     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              🤖 Générer avec Gemini                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📝 Votre lettre                                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Madame, Monsieur,                                   │   │
│  │                                                     │   │
│  │ C'est avec un vif intérêt que j'ai découvert votre │   │
│  │ offre de Développeur Full Stack au sein de         │   │
│  │ TechCorp SA. Fort de 5 années d'expérience en      │   │
│  │ développement JavaScript...                         │   │
│  │                                                     │   │
│  │ [Éditable par l'utilisateur]                       │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐   │
│  │ 📋 Copier    │  │ 📄 Export PDF│  │ 💾 Sauvegarder │   │
│  └──────────────┘  └──────────────┘  └────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 Prompt de génération

```javascript
const COVER_LETTER_PROMPT = `
Tu es un expert en rédaction de lettres de motivation professionnelles en français de Belgique.

## Profil du candidat
${JSON.stringify(candidateProfile, null, 2)}

## Offre d'emploi
Titre: ${job.title}
Entreprise: ${job.company}
Description: ${job.description}
Compétences: ${job.skills?.join(', ')}

## Style demandé
${style} (formel/équilibré/dynamique)

## Points à mettre en avant
${highlights || "Aucun point spécifique mentionné"}

## Instructions
Rédige une lettre de motivation:
- En français de Belgique (utilise "Madame, Monsieur" pas "À qui de droit")
- 3-4 paragraphes maximum
- Personnalisée pour l'entreprise et le poste
- Mettant en valeur les compétences correspondantes du candidat
- Avec une accroche originale
- Sans phrases clichés comme "Je me permets de vous écrire"
- Avec une formule de politesse belge appropriée

Réponds UNIQUEMENT avec la lettre, sans introduction ni commentaire.
`;
```

### 4.4 Fonctionnalités avancées

#### Régénération partielle
- Régénérer uniquement l'accroche
- Régénérer uniquement la conclusion
- Reformuler un paragraphe sélectionné

#### Templates personnalisés
```javascript
const templates = {
  standard: "Lettre classique",
  creative: "Approche créative",
  technical: "Focus compétences techniques",
  motivation: "Focus motivation et valeurs"
};
```

#### Historique des lettres
- Sauvegarder les lettres générées par offre
- Réutiliser des paragraphes de lettres précédentes
- Statistiques d'utilisation

### 4.5 Tâches de développement

- [ ] Créer le modal de génération de lettre
- [ ] Implémenter le prompt de génération
- [ ] Ajouter l'éditeur de texte riche
- [ ] Implémenter l'export PDF (html2pdf.js)
- [ ] Ajouter la copie dans le presse-papier
- [ ] Créer le système de templates
- [ ] Implémenter la régénération partielle
- [ ] Ajouter l'historique des lettres

---

## Phase 5 : Stockage et confidentialité

### 5.1 Données stockées

| Clé localStorage | Description | Chiffré |
|------------------|-------------|---------|
| `forem_cv_profile` | Profil extrait du CV | ✅ Oui |
| `forem_gemini_key` | Clé API Gemini | ✅ Oui |
| `forem_ai_cache` | Cache des réponses IA | ❌ Non |
| `forem_cover_letters` | Lettres sauvegardées | ✅ Oui |
| `forem_matching_scores` | Scores de matching | ❌ Non |

### 5.2 Chiffrement

```javascript
// Utilisation de Web Crypto API
const ENCRYPTION_KEY = await deriveKeyFromPassword(userPassword);

async function encryptData(data) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    ENCRYPTION_KEY,
    new TextEncoder().encode(JSON.stringify(data))
  );
  return { iv: Array.from(iv), data: Array.from(new Uint8Array(encrypted)) };
}
```

### 5.3 Politique de confidentialité

- ⚠️ Le CV n'est jamais envoyé en entier à Gemini
- ⚠️ Seules les informations pertinentes sont transmises
- ⚠️ Option "mode hors-ligne" avec scoring local simplifié
- ⚠️ Export/suppression de toutes les données personnelles

---

## Phase 6 : Interface utilisateur globale

### 6.1 Navigation mise à jour

```
┌────────────────────────────────────────────────────────────┐
│  🔍 FOREM Explorer                                         │
├──────────┬──────────┬──────────┬──────────┬───────────────┤
│ Recherche│ Dashboard│  Profil  │ Lettres  │  Paramètres   │
│    🔍    │    📊    │   👤 ✨  │   ✉️ ✨   │      ⚙️       │
└──────────┴──────────┴──────────┴──────────┴───────────────┘
                          ✨ = Nouvelles pages
```

### 6.2 Nouveaux fichiers HTML

| Fichier | Description |
|---------|-------------|
| `profile.html` | Gestion du CV et profil candidat |
| `letters.html` | Historique des lettres de motivation |
| `settings.html` | Configuration IA et confidentialité |

### 6.3 Indicateurs visuels

```
Légende des badges de score:
┌────────────────────────────────────┐
│  🟢 85-100%  Excellent match       │
│  🟡 60-84%   Bon match             │
│  🟠 40-59%   Match partiel         │
│  🔴 0-39%    Faible match          │
└────────────────────────────────────┘
```

---

## Estimation du temps de développement

| Phase | Durée estimée | Priorité |
|-------|---------------|----------|
| Phase 1 : Support rx-resume | 2-3 jours | 🔴 Haute |
| Phase 2 : Intégration Gemini | 2-3 jours | 🔴 Haute |
| Phase 3 : Scoring intelligent | 3-4 jours | 🔴 Haute |
| Phase 4 : Lettres de motivation | 3-4 jours | 🟡 Moyenne |
| Phase 5 : Stockage sécurisé | 1-2 jours | 🟡 Moyenne |
| Phase 6 : UI globale | 2-3 jours | 🟢 Basse |

**Total estimé : 13-19 jours de développement**

---

## Dépendances externes

### Librairies JavaScript

```json
{
  "dependencies": {
    "html2pdf.js": "^0.10.1"  // Export PDF des lettres
  }
}
```

### APIs externes

| Service | Usage | Coût |
|---------|-------|------|
| Google Gemini API | Scoring + génération | Gratuit jusqu'à 60 req/min |

### CDN à ajouter

```html
<!-- Export PDF -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
```

---

## Risques et mitigations

| Risque | Impact | Mitigation |
|--------|--------|------------|
| Rate limiting Gemini | Fonctionnalité dégradée | Cache agressif + scoring local de secours |
| Format rx-resume changeant | Import cassé | Validation stricte + versioning |
| Données sensibles | Vie privée | Chiffrement + pas d'envoi du CV complet |
| Qualité des lettres générées | UX dégradée | Templates + édition manuelle |
| Coût API si usage intensif | Budget | Quotas utilisateur + mode gratuit limité |

---

## Métriques de succès

- 📈 Taux d'import de CV réussi > 95%
- 📈 Temps de scoring < 3s par offre
- 📈 Satisfaction lettres générées > 4/5
- 📈 Taux d'utilisation de la fonction lettre > 30%

---

## Prochaines étapes

1. **Valider le plan** avec les parties prenantes
2. **Créer les issues GitHub** pour chaque phase
3. **Commencer par Phase 1** : Support rx-resume
4. **Obtenir une clé API Gemini** de test
5. **Prototyper le scoring** avec quelques offres test

---

*Document créé le 12 janvier 2026*
*Version 1.0*
