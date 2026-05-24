const Anthropic = require('@anthropic-ai/sdk');

let client = null;

function getClient() {
  if (!client && process.env.ANTHROPIC_API_KEY) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

// Messages de fallback garantis — affichés si l'API est indisponible
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

const SYSTEM_PROMPT = `Tu es Aïcha, l'assistante psychologue bienveillante de HerSafety.
Tu soutiens les femmes en situation de stress, de peur ou de danger avec empathie, écoute et guidance pratique.

Ton attitude :
- Chaleureuse, non-jugmentale, rassurante
- Tu reconnais ses émotions et valides ses peurs
- Tu poses des questions douces pour mieux comprendre sa situation
- Tu donnes des conseils pratiques ET du soutien émotionnel
- Ton ton est conversationnel, comme avec une amie bienveillante

Règles :
- Réponds TOUJOURS en français
- Limite tes réponses à 2-4 phrases courtes et claires (jamais d'énumérés)
- Commence souvent par : "Je comprends..." ou "C'est courageux de..."
- Pose des questions de suivi pour l'aider à clarifier et se sentir entendue
- Intègre des pauses respiratoires douces si approprié
- Termine par une action concrète ET du soutien émotionnel
- Sois toi-même : use d'empathie authentique`;

async function getAssistMessage({ level, context, conversationHistory = [] }) {
  const fallback = FALLBACK[level] || FALLBACK['2'];
  const ai = getClient();

  if (!ai) return { message: fallback, source: 'fallback' };

  try {
    // Construire l'historique de conversation avec le format Anthropic
    const messages = conversationHistory.length > 0
      ? conversationHistory
      : [];

    // Ajouter le message utilisateur initial
    const initialContext = `Niveau d'urgence ${level}/4. ${LEVEL_CONTEXT[level]}${context ? ` Contexte : ${context}` : ''}`;
    messages.push({
      role: 'user',
      content: initialContext,
    });

    const response = await ai.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system:     SYSTEM_PROMPT,
      messages:   messages,
    });

    const message = response.content[0]?.text?.trim() || fallback;
    return { message, source: 'claude' };
  } catch (_err) {
    return { message: fallback, source: 'fallback' };
  }
}

module.exports = { getAssistMessage, FALLBACK };
