# Comparaison des Algorithmes de Scoring : Local vs IA

## 1. Score Local (Algorithmique Déterministe)

Calculé instantanément dans le navigateur, il utilise une approche basée sur des règles strictes.

**Logique de calcul :**

- **Compétences (Max 40 pts) :**
  - Points dégressifs : 1er match = 10pts, 2e = 8pts ... jusqu'à 3pts.
  - Bonus Titre (+15 pts max) si la compétence est aussi dans le titre de l'offre.
  - Détection "Fuzzy" (Levenshtein) pour tolérer les fautes de frappe.

- **Headline/Métier (Max 15 pts) :**
  - Compare le titre du profil (ex: "Développeur Web") avec le titre de l'offre.
  
- **Mots-clés CV (Max 12 pts) :**
  - Recherche des mots-clés extraits du CV dans le corps de l'offre.
  - Bonus Titre (+16 pts max).

- **Localisation (Max 15 pts) :**
  - ≤ 10km : 15pts
  - ≤ 25km : 12pts
  - ≤ 50km : 8pts
  - Sinon : Dégressif ou correspondance Ville/Région (10pts/5pts).

- **Expérience & Langues (Max 20 pts) :**
  - Expérience suffisante = 10pts.
  - Langues communes = 10pts.

**Limites :** 
- Risque de "faux positifs" (ex: "Je ne fais pas de Java" compte comme un match "Java").
- Ne comprend pas les synonymes complexes.

---

## 2. Score IA (Analyse Sémantique - Gemini)

Calculé à la demande, il utilise l'intelligence artificielle pour simuler un recruteur expert.

**Logique :**

1. **Extraction intelligente :**
   - Le prompt reçoit une version structurée du CV et de l'offre.
   - Les descriptions tronquées sont analysées sémantiquement.

2. **Évaluation Contextuelle :**
   - Comprend les synonymes ("JS" = "Javascript").
   - Comprend la hiérarchie ("Notions" vs "Expert").
   - Identifie les **compétences manquantes** qui ne sont pas dans le CV mais requises par l'offre.

3. **Restitution :**
   - Retourne un score global (0-100).
   - Liste les points forts (Skills matchés).
   - Liste les points faibles (Skills manquants).
   - Donne un avis sur l'expérience et la localisation.

**Avantage clé :** Capable de dire "Ce profil est pertinent car il maîtrise des technos similaires" même sans match de mot-clé exact.

---

## Tableau Comparatif

| Caractéristique | Score Local | Score IA |
|-----------------|-------------|----------|
| **Vitesse**     | Instantané (<10ms) | ~1-3 secondes |
| **Logique**     | Mots-clés & Règles | Sémantique & Contexte |
| **Coût**        | Gratuit (Client-side) | Coût API / Quota |
| **Objectif**    | Tri de masse | Validation approfondie |
| **Max Score**   | Plafonné à 95% | Peut atteindre 100% |