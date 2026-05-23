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

const SYSTEM_PROMPT = `Tu es l'assistante IA de HerSafety, une application de sécurité personnelle pour femmes en Côte d'Ivoire.
Ton rôle : apporter un soutien immédiat, bienveillant et pratique en situation de stress ou de danger.
Règles absolues :
- Réponds TOUJOURS en français
- Maximum 3 phrases courtes et claires
- Commence par rassurer, puis donne une action concrète
- Ne pose jamais de questions
- N'utilise jamais de termes techniques`;

async function getAssistMessage({ level, context }) {
  const fallback = FALLBACK[level] || FALLBACK['2'];
  const ai = getClient();

  if (!ai) return { message: fallback, source: 'fallback' };

  try {
    const userContent = `Niveau d'urgence ${level}/4. ${LEVEL_CONTEXT[level]}${context ? ` Contexte : ${context}` : ''} Que dois-je faire maintenant ?`;

    const response = await ai.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system:     SYSTEM_PROMPT,
      messages:   [{ role: 'user', content: userContent }],
    });

    const message = response.content[0]?.text?.trim() || fallback;
    return { message, source: 'claude' };
  } catch (_err) {
    return { message: fallback, source: 'fallback' };
  }
}

module.exports = { getAssistMessage, FALLBACK };
