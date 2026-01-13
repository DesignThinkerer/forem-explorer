/**
 * CV Parser Module
 * Parser et validateur pour le format rx-resume (Reactive Resume)
 */

/**
 * Valide la structure d'un CV au format rx-resume
 * @param {Object} data - Les données JSON du CV
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export function validateRxResume(data) {
    const errors = [];
    
    // Vérifier la présence des champs obligatoires
    if (!data) {
        errors.push('Le fichier est vide ou invalide');
        return { valid: false, errors };
    }
    
    // Vérifier basics
    if (!data.basics) {
        errors.push('Section "basics" manquante');
    } else {
        if (!data.basics.name) {
            errors.push('Nom manquant dans "basics"');
        }
    }
    
    // Vérifier sections (optionnel mais attendu)
    if (!data.sections) {
        errors.push('Section "sections" manquante');
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Parse un fichier JSON rx-resume et extrait les informations
 * @param {string} jsonString - Le contenu JSON du fichier
 * @returns {Object} { success: boolean, data?: Object, error?: string }
 */
export function parseRxResume(jsonString) {
    try {
        const data = JSON.parse(jsonString);
        const validation = validateRxResume(data);
        
        if (!validation.valid) {
            return {
                success: false,
                error: validation.errors.join(', ')
            };
        }
        
        return {
            success: true,
            data: data
        };
    } catch (e) {
        return {
            success: false,
            error: `Erreur de parsing JSON: ${e.message}`
        };
    }
}

/**
 * Extrait les compétences du CV rx-resume
 * @param {Object} cvData - Les données du CV parsé
 * @returns {Array} Liste des compétences normalisées
 */
export function extractSkills(cvData) {
    const skills = [];
    
    // Extraire depuis sections.skills
    if (cvData.sections?.skills?.items) {
        cvData.sections.skills.items.forEach(skill => {
            if (skill.name) {
                skills.push({
                    name: skill.name,
                    level: skill.level || 3,
                    keywords: skill.keywords || [],
                    category: categorizeSkill(skill.name)
                });
            }
        });
    }
    
    // Extraire les mots-clés des expériences
    if (cvData.sections?.experience?.items) {
        cvData.sections.experience.items.forEach(exp => {
            if (exp.summary) {
                const extractedSkills = extractSkillsFromText(exp.summary);
                extractedSkills.forEach(skillName => {
                    if (!skills.find(s => s.name.toLowerCase() === skillName.toLowerCase())) {
                        skills.push({
                            name: skillName,
                            level: 2,
                            keywords: [],
                            category: categorizeSkill(skillName),
                            extracted: true
                        });
                    }
                });
            }
        });
    }
    
    return skills;
}

/**
 * Catégorise une compétence
 * @param {string} skillName - Nom de la compétence
 * @returns {string} Catégorie
 */
function categorizeSkill(skillName) {
    const name = skillName.toLowerCase();
    
    const categories = {
        programming: ['javascript', 'python', 'java', 'c#', 'c++', 'php', 'ruby', 'go', 'rust', 'typescript', 'swift', 'kotlin'],
        framework: ['react', 'angular', 'vue', 'node', 'express', 'django', 'flask', 'spring', 'laravel', '.net', 'next.js', 'nuxt'],
        database: ['sql', 'mysql', 'postgresql', 'mongodb', 'redis', 'oracle', 'sqlite', 'firebase'],
        devops: ['docker', 'kubernetes', 'aws', 'azure', 'gcp', 'jenkins', 'gitlab', 'github', 'ci/cd', 'terraform'],
        design: ['figma', 'photoshop', 'illustrator', 'sketch', 'xd', 'ui', 'ux', 'css', 'sass', 'tailwind'],
        soft: ['communication', 'leadership', 'gestion', 'management', 'agile', 'scrum', 'teamwork', 'problem-solving']
    };
    
    for (const [category, keywords] of Object.entries(categories)) {
        if (keywords.some(kw => name.includes(kw))) {
            return category;
        }
    }
    
    return 'other';
}

/**
 * Extrait les compétences potentielles d'un texte
 * @param {string} text - Le texte à analyser
 * @returns {string[]} Liste des compétences trouvées
 */
function extractSkillsFromText(text) {
    const commonSkills = [
        'JavaScript', 'Python', 'Java', 'React', 'Angular', 'Vue.js', 'Node.js',
        'SQL', 'MongoDB', 'PostgreSQL', 'MySQL', 'Docker', 'Kubernetes', 'AWS',
        'Azure', 'Git', 'Agile', 'Scrum', 'TypeScript', 'PHP', 'Laravel', 'Django',
        'Express', 'GraphQL', 'REST', 'API', 'HTML', 'CSS', 'SASS', 'Tailwind',
        'Bootstrap', 'Figma', 'Linux', 'Windows', 'macOS', 'Excel', 'Word',
        'PowerPoint', 'SAP', 'Salesforce', 'Jira', 'Confluence'
    ];
    
    const found = [];
    const lowerText = text.toLowerCase();
    
    commonSkills.forEach(skill => {
        if (lowerText.includes(skill.toLowerCase()) && !found.includes(skill)) {
            found.push(skill);
        }
    });
    
    return found;
}

/**
 * Calcule les années d'expérience totales
 * @param {Object} cvData - Les données du CV
 * @returns {number} Nombre d'années d'expérience
 */
export function calculateExperienceYears(cvData) {
    if (!cvData.sections?.experience?.items) return 0;
    
    let totalMonths = 0;
    
    cvData.sections.experience.items.forEach(exp => {
        if (exp.date) {
            // Format attendu: "Jan 2020 - Dec 2023" ou "2020 - Present"
            const dateStr = exp.date;
            const parts = dateStr.split(' - ');
            
            if (parts.length === 2) {
                const startDate = parseDate(parts[0].trim());
                const endDate = parts[1].toLowerCase().includes('present') || parts[1].toLowerCase().includes('actuel')
                    ? new Date()
                    : parseDate(parts[1].trim());
                
                if (startDate && endDate) {
                    const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 +
                                   (endDate.getMonth() - startDate.getMonth());
                    totalMonths += Math.max(0, months);
                }
            }
        }
    });
    
    return Math.round(totalMonths / 12 * 10) / 10; // Arrondi à 1 décimale
}

/**
 * Parse une date en format texte
 * @param {string} dateStr - La date en texte
 * @returns {Date|null}
 */
function parseDate(dateStr) {
    const months = {
        'jan': 0, 'fév': 1, 'feb': 1, 'mar': 2, 'avr': 3, 'apr': 3,
        'mai': 4, 'may': 4, 'jun': 5, 'jui': 6, 'jul': 6, 'aoû': 7, 'aug': 7,
        'sep': 8, 'oct': 9, 'nov': 10, 'déc': 11, 'dec': 11
    };
    
    // Essayer format "Month Year" ou "Mon Year"
    const match = dateStr.match(/(\w+)\s*(\d{4})/i);
    if (match) {
        const monthStr = match[1].toLowerCase().substring(0, 3);
        const year = parseInt(match[2]);
        const month = months[monthStr] ?? 0;
        return new Date(year, month, 1);
    }
    
    // Essayer format "Year" seul
    const yearOnly = dateStr.match(/^(\d{4})$/);
    if (yearOnly) {
        return new Date(parseInt(yearOnly[1]), 0, 1);
    }
    
    return null;
}

/**
 * Extrait les langues du CV
 * @param {Object} cvData - Les données du CV
 * @returns {Array} Liste des langues
 */
export function extractLanguages(cvData) {
    if (!cvData.sections?.languages?.items) return [];
    
    return cvData.sections.languages.items.map(lang => ({
        name: lang.name || 'Inconnu',
        level: normalizeLanguageLevel(lang.description || lang.level || 'intermediate')
    }));
}

/**
 * Normalise le niveau de langue
 * @param {string} level - Le niveau brut
 * @returns {string} Niveau normalisé
 */
function normalizeLanguageLevel(level) {
    const levelStr = String(level).toLowerCase();
    
    if (levelStr.includes('native') || levelStr.includes('maternel') || levelStr.includes('natif')) {
        return 'native';
    }
    if (levelStr.includes('fluent') || levelStr.includes('courant') || levelStr.includes('bilingue')) {
        return 'fluent';
    }
    if (levelStr.includes('advanced') || levelStr.includes('avancé')) {
        return 'advanced';
    }
    if (levelStr.includes('intermediate') || levelStr.includes('intermédiaire')) {
        return 'intermediate';
    }
    if (levelStr.includes('basic') || levelStr.includes('débutant') || levelStr.includes('notions')) {
        return 'basic';
    }
    
    return 'intermediate';
}

/**
 * Extrait le niveau d'éducation le plus élevé
 * @param {Object} cvData - Les données du CV
 * @returns {Object} { level: string, field: string[] }
 */
export function extractEducation(cvData) {
    if (!cvData.sections?.education?.items) {
        return { level: 'unknown', fields: [] };
    }
    
    const levels = {
        'doctorat': 5, 'phd': 5, 'doctorate': 5,
        'master': 4, 'mba': 4, 'msc': 4,
        'licence': 3, 'bachelor': 3, 'bsc': 3, 'bac+3': 3,
        'bts': 2, 'dut': 2, 'bac+2': 2,
        'baccalauréat': 1, 'bac': 1, 'cess': 1
    };
    
    let highestLevel = 0;
    let highestLevelName = 'unknown';
    const fields = [];
    
    cvData.sections.education.items.forEach(edu => {
        const studyType = (edu.studyType || edu.degree || '').toLowerCase();
        const area = edu.area || edu.field || '';
        
        // Trouver le niveau
        for (const [levelName, levelValue] of Object.entries(levels)) {
            if (studyType.includes(levelName) && levelValue > highestLevel) {
                highestLevel = levelValue;
                highestLevelName = levelName;
            }
        }
        
        // Collecter les domaines
        if (area && !fields.includes(area)) {
            fields.push(area);
        }
    });
    
    return {
        level: highestLevelName,
        fields: fields
    };
}
