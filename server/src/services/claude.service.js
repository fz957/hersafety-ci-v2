// Service pour appeler l'API Groq (compatible avec Anthropic messages API)

// Logger helper - only logs in development mode
const isDev = process.env.NODE_ENV === 'development';
const log = (...args) => isDev && console.log(...args);

// Messages de fallback garantis
const FALLBACK = {
  '1': 'Restez vigilante. Faites confiance à votre instinct, restez dans des zones éclairées et fréquentées.',
  '2': 'Vous n\'êtes pas seule. Respirez lentement : inspirez 4 secondes, retenez 4 secondes, expirez 4 secondes. Vos contacts ont été alertés.',
  '3': 'Vous êtes forte et courageuse. Si vous le pouvez, éloignez-vous calmement de la situation. Le 110 est disponible — un seul appel suffit.',
  '4': 'Appelez le 110 immédiatement. Si vous ne pouvez pas parler, restez en ligne. Vous n\'êtes pas seule.',
};

const LEVEL_CONTEXT = {
  '1': 'L\'utilisatrice signale une situation de vigilance. Elle surveille son environnement.',
  '2': 'L\'utilisatrice ne se sent pas bien. Elle a besoin de réassurance et de guidage respiratoire.',
  '3': 'L\'utilisatrice est en danger. Elle a besoin de guidance immédiate, rassurante et pratique.',
  '4': 'L\'utilisatrice est en danger immédiat. Chaque seconde compte. Sois directe.',
};

const SYSTEM_PROMPT = `Tu es Lyra, l'assistante bienveillante et psychologue de HerSafety.
Tu soutiens les femmes en situation de stress, de peur ou de danger avec empathie, écoute et guidance pratique.

Ton attitude :
- Chaleureuse, non-jugementale, rassurante
- Tu reconnais ses émotions et valides ses peurs
- Tu poses des questions douces pour mieux comprendre sa situation
- Tu donnes des conseils pratiques ET du soutien émotionnel
- Ton ton est conversationnel, comme avec une amie bienveillante

Ressources disponibles (si fournies) :
- Localisation GPS : utilise-la pour suggérer les lieux sûrs les plus proches
- Numéros d'urgence : mentionne les numéros pertinents selon la situation
- Lieux sûrs proches : propose des destinations concrètes (police, pharmacie, hôpital, etc.)
- Options VTC : propose les applications de transport pour quitter la zone

Règles :
- Réponds TOUJOURS en français
- Limite tes réponses à 2-4 phrases courtes et claires (jamais d'énumérés)
- Commence souvent par : "Je comprends..." ou "C'est courageux de..."
- Pose des questions de suivi pour l'aider à clarifier et se sentir entendue
- Intègre des pauses respiratoires douces si approprié
- Termine par une action concrète ET du soutien émotionnel
- Sois toi-même : use d'empathie authentique
- Sois SPÉCIFIQUE : utilise les numéros réels et noms de lieux si disponibles`;

const SYSTEM_PROMPT_EVALUATOR = `Tu es Lyra, assistante intelligente de HerSafety pour l'évaluation de sécurité.
L'utilisatrice a dit "je vais pas bien" lors d'un check-in. Tu dois :
1. Poser des questions pour COMPRENDRE sa situation
2. ÉVALUER le niveau de risque : 'low' (OK, conseils suffisent), 'medium' (surveiller), 'high' (danger immédiat)
3. Recommander une action

Ton attitude :
- Calme, rassurante, non-jugementale
- Écoute active, pose 1-2 questions pour clarifier
- Sois brève et directe

Règles de réponse (IMPORTANT) :
- Réponds TOUJOURS en JSON avec cette structure exacte :
{
  "message": "ta réponse empathique en français (2-4 phrases)",
  "riskLevel": "low|medium|high",
  "resolved": false
}
- En 'low': situation maîtrisée, conseils donnés
- En 'medium': situation à surveiller, peut escalader si elle continue à pas bien aller
- En 'high': danger détecté, elle doit activer Emergency
- Sois précise sur le risque : pose des questions si flou
- JAMAIS de texte en dehors du JSON`;

async function getAssistMessage({ level, context = {}, conversationHistory = [], mode = 'default' }) {
  const fallback = FALLBACK[level] || FALLBACK['2'];

  try {
    // Normaliser le contexte: peut être un string, objet, ou undefined
    const contextObj = (typeof context === 'object' && context !== null) ? context : {};

    // Construire l'historique de conversation
    const messages = conversationHistory.length > 0
      ? conversationHistory.map(msg => ({
          role: msg.role,
          content: msg.content,
        }))
      : [];

    // Sélectionner le prompt approprié selon le mode
    let systemPrompt = SYSTEM_PROMPT;

    // Créer le contexte à inclure dans chaque message système
    let contextInfo = '';
    if (contextObj.position) {
      contextInfo += `📍 GPS: ${contextObj.position.lat.toFixed(4)}, ${contextObj.position.lng.toFixed(4)}\n`;
    }
    if (contextObj.emergencyNumbers && contextObj.emergencyNumbers.length > 0) {
      const nums = contextObj.emergencyNumbers.slice(0, 3).map(e => `${e.number} (${e.name})`).join(', ');
      contextInfo += `📞 ${nums}\n`;
    }
    if (contextObj.nearbyPlaces && contextObj.nearbyPlaces.length > 0) {
      const places = contextObj.nearbyPlaces.slice(0, 3).map(p => `${p.name} (${p.type})`).join(', ');
      contextInfo += `🏠 ${places}\n`;
    }
    if (contextObj.vtcOptions && contextObj.vtcOptions.length > 0) {
      const vtc = contextObj.vtcOptions.map(v => v.n).join(', ');
      contextInfo += `🚗 ${vtc}\n`;
    }

    // Si c'est la première fois (pas d'historique), ajouter le contexte initial
    if (messages.length === 0) {
      let initialContext = `Niveau d'urgence ${level}/4. ${LEVEL_CONTEXT[level]}\n\n${contextInfo}`;

      if (mode === 'evaluator') {
        systemPrompt = SYSTEM_PROMPT_EVALUATOR;
        initialContext = `L'utilisatrice vient de dire "je vais pas bien" pendant un check-in de sécurité.`;
      }

      messages.push({
        role: 'user',
        content: initialContext,
      });
    } else if (mode === 'evaluator') {
      systemPrompt = SYSTEM_PROMPT_EVALUATOR;
    } else if (contextInfo) {
      // Pour les messages suivants, inclure aussi le contexte mis à jour
      systemPrompt += `\n\nContexte actuel:\n${contextInfo}`;
    }
    // Si on a déjà un historique, les messages sont déjà là

    // Appeler l'API Groq
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant', // Modèle Groq production - rapide et disponible
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        temperature: 0.7,
        max_tokens: 600,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[Groq] Erreur API Status:', response.status);
      console.error('[Groq] Erreur complète:', JSON.stringify(error, null, 2));
      return { message: fallback, source: 'fallback' };
    }

    const data = await response.json();
    log('[Groq] Réponse réussie:', data.choices?.[0]?.message?.content?.substring(0, 100));
    let responseText = data.choices?.[0]?.message?.content?.trim() || '';

    // Pour le mode evaluator, extraire le JSON
    if (mode === 'evaluator' || mode === 'evaluator_continuity') {
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            message: parsed.message || fallback,
            riskLevel: parsed.riskLevel || 'medium',
            resolved: parsed.resolved || false,
            source: 'groq',
          };
        }
      } catch (parseErr) {
        console.error('[Groq] Erreur parse JSON:', parseErr.message);
        return { message: fallback, riskLevel: 'medium', resolved: false, source: 'fallback' };
      }
    }

    // Mode par défaut : retourner le message texte
    return { message: responseText || fallback, source: 'groq' };

  } catch (err) {
    console.error('[Groq] Erreur:', err.message);
    if (mode === 'evaluator') {
      return { message: fallback, riskLevel: 'medium', resolved: false, source: 'fallback' };
    }
    return { message: fallback, source: 'fallback' };
  }
}

// ────────────────────────────────────────────────────────────────────────────
// ADMIN MODES
// ────────────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT_ADMIN_SUMMARY = `Tu es l'assistant IA de l'administrateur HerSafety.

GÉNÈRE UN TABLEAU RÉCAPITULATIF DU JOUR - FACILE À LIRE:

Utilise ce format MARKDOWN TABLEAU:

| Métrique | Aujourd'hui | Status |
|----------|-------------|--------|
| Alertes | [nombre] | [🟢/🟡/🔴] |
| Niveau 1 (Vigilance) | [nombre] | |
| Niveau 2 (Malaise) | [nombre] | |
| Niveau 3 (Danger) | [nombre] | 🚨 SI > 0 |
| Niveau 4 (SOS) | [nombre] | 🚨 SI > 0 |
| Utilisatrices actives | [nombre] | |
| Articles/Photos/Vidéos | [total] | |
| Commentaires | [nombre] | |
| Signalements en attente | [nombre] | 🔴 SI > 0 |

⚡ PRIORITÉS DU JOUR:
- [Action 1 basée sur les données]
- [Action 2 basée sur les données]
- [Action 3 basée sur les données]

Utilise UNIQUEMENT les chiffres réels. Pas d'inventions.`;

const SYSTEM_PROMPT_ADMIN_ALERTS = `Tu es l'assistant IA expert pour l'analyse des alertes HerSafety.

GÉNÈRE DEUX TABLEAUX CLAIRS ET RAPIDES À LIRE:

TABLEAU 1 - DISTRIBUTION DES ALERTES:
| Niveau | Alertes | % | Status |
|--------|---------|---|--------|
| 🟢 Vigilance | [X] | [%] | |
| 🟡 Malaise | [X] | [%] | |
| 🟠 DANGER | [X] | [%] | 🚨 SI > 0 |
| 🔴 SOS | [X] | [%] | 🚨 SI > 0 |
| **TOTAL ACTIVES** | **[X]** | **100%** | À traiter |

TABLEAU 2 - TOP UTILISATRICES (les plus actives):
| Rang | Utilisatrice | Alertes | Action |
|------|--------------|---------|--------|
| 1 | [Nom] | [N] | Contacter |
| 2 | [Nom] | [N] | Vérifier |
| 3 | [Nom] | [N] | Vérifier |

⚡ ACTIONS IMMÉDIATEMENT:
- [Action 1]
- [Action 2]

Utilise UNIQUEMENT les chiffres réels. Format tableau markdown.`;

const SYSTEM_PROMPT_ADMIN_REPORTS = `Tu es l'assistant IA expert en gestion des zones dangereuses pour HerSafety CI.

GÉNÈRE TROIS TABLEAUX CLAIRS ET STRUCTURÉS:

TABLEAU 1 - ÉTAT DES SIGNALEMENTS:
| État | Nombre | % | Action |
|------|--------|---|--------|
| ✅ Vérifiés | [X] | [%] | Archiver |
| ⏳ En attente | [X] | [%] | 🔴 URGENT |
| 📊 TOTAL | [X] | 100% | |

TABLEAU 2 - ZONES LES PLUS DANGEREUSES (par nombre de signalements):
| Rang | Zone | Signalements | Danger principal | Urgence |
|------|------|--------------|------------------|---------|
| 1 | [Lieu] | [X] | [Type] | 🔴 |
| 2 | [Lieu] | [X] | [Type] | 🟡 |
| 3 | [Lieu] | [X] | [Type] | 🟡 |

TABLEAU 3 - TYPES DE DANGER LES PLUS COURANTS:
| Type de danger | Nombre | % | Zones affectées |
|----------------|--------|---|-----------------|
| [Type] | [X] | [%] | [Lieux] |
| [Type] | [X] | [%] | [Lieux] |
| [Type] | [X] | [%] | [Lieux] |

⚡ À FAIRE MAINTENANT:
- [Action 1 concrète]
- [Action 2 concrète]

Utilise UNIQUEMENT les chiffres réels. Format markdown tableau.`;

const SYSTEM_PROMPT_ADMIN_MODERATION = `Tu es expert en modération de contenu pour HerSafety CI.

GÉNÈRE DEUX TABLEAUX POUR LA MODÉRATION:

TABLEAU 1 - CONTENU EN LIGNE:
| Type de contenu | Nombre | Status |
|-----------------|--------|--------|
| 📹 Vidéos approuvées | [X] | ✅ |
| 📝 Articles | [X] | ✅ |
| 📷 Photos | [X] | ✅ |
| 💬 Commentaires | [X] | ✅ |
| 👥 Utilisatrices actives | [X] | ✅ |

TABLEAU 2 - À MODÉRER (URGENT):
| Élément | Nombre | Urgence | Action |
|---------|--------|---------|--------|
| 📋 Témoignages en attente | [X] | 🔴 | Valider/Rejeter |
| 🚩 Posts flaggés | [X] | 🔴 | Vérifier/Supprimer |
| ⚠️ Contenu suspect | [X] | 🟡 | Examiner |

⚡ PRIORITÉS DE MODÉRATION:
1. [Action urgente 1]
2. [Action urgente 2]
3. [Action urgente 3]

Utilise UNIQUEMENT les chiffres réels. Format markdown tableau.`;

const SYSTEM_PROMPT_ADMIN_ANOMALIES = `Tu es expert en détection d'anomalies.

Données fournies:
- Anomalies détectées
- Pics d'alertes
- Zones avec concentration anormale
- Utilisateurs suspects

Ton rôle:
1. LISTE chaque anomalie
2. ÉVALUE la gravité (LOW/MEDIUM/HIGH)
3. SUGGÈRE une action (vérifier, bloquer, surveiller)
4. Donne un contexte clair

Sois alarmiste si nécessaire - c'est ton rôle.`;

const SYSTEM_PROMPT_ADMIN_CHAT = `Tu es l'assistant IA personnel de l'administrateur HerSafety.

Tu aides avec:
- Questions sur les statistiques
- Conseils de modération
- Recommandations de sécurité
- Analyse de patterns
- Gestion des crises

Ton attitude:
- Professionnel et utile
- Basé sur des données réelles
- Pas de spéculation, seulement des faits
- Suggère des actions concrètes

Réponds en français, sois concis et clair.`;

/**
 * Get admin assistant message
 */
async function getAdminAssistMessage({
  mode = 'chat',
  data = {},
  question = '',
  conversationHistory = []
}) {
  const adminFallback = 'Je n\'ai pas pu traiter votre demande. Veuillez réessayer.';

  try {
    // Sélectionner le prompt selon le mode
    let systemPrompt = SYSTEM_PROMPT_ADMIN_CHAT;

    switch (mode) {
      case 'summary':
        systemPrompt = SYSTEM_PROMPT_ADMIN_SUMMARY;
        break;
      case 'alerts':
        systemPrompt = SYSTEM_PROMPT_ADMIN_ALERTS;
        break;
      case 'reports':
        systemPrompt = SYSTEM_PROMPT_ADMIN_REPORTS;
        break;
      case 'moderation':
        systemPrompt = SYSTEM_PROMPT_ADMIN_MODERATION;
        break;
      case 'anomalies':
        systemPrompt = SYSTEM_PROMPT_ADMIN_ANOMALIES;
        break;
      default:
        systemPrompt = SYSTEM_PROMPT_ADMIN_CHAT;
    }

    // Construire les messages
    let messages = [];

    // Ajouter l'historique de conversation
    if (conversationHistory.length > 0) {
      messages = conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));
    }

    // Ajouter le contexte des données
    let dataContext = '';
    if (Object.keys(data).length > 0) {
      dataContext = `\n\n📊 DONNÉES DU JOUR:\n${JSON.stringify(data, null, 2)}`;
    }

    // Ajouter la question/demande actuelle
    if (question) {
      messages.push({
        role: 'user',
        content: question + dataContext,
      });
    } else if (dataContext && messages.length === 0) {
      // Si pas de question mais des données, générer un résumé
      messages.push({
        role: 'user',
        content: `Analyse ces données et génère un résumé utile:${dataContext}`,
      });
    }

    // Appeler Groq
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          ...messages,
        ],
        temperature: 0.7,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      console.error('[Groq Admin] Erreur API:', response.status);
      return { message: adminFallback, source: 'fallback' };
    }

    const result = await response.json();
    let responseText = result.choices?.[0]?.message?.content?.trim() || '';

    // Nettoyer les caractères mal encodés
    responseText = responseText
      .replace(/\?{2,}/g, '') // Enlever les ?? mal encodés
      .replace(/([A-Z][a-z]+)\s*\?{1,2}/g, '$1') // Réparer les noms cassés
      .normalize('NFC');

    return {
      message: responseText || adminFallback,
      source: 'groq',
      mode: mode,
    };
  } catch (err) {
    console.error('[Admin Assistant] Erreur:', err.message);
    return { message: adminFallback, source: 'fallback', mode: mode };
  }
}

module.exports = { getAssistMessage, getAdminAssistMessage, FALLBACK };
