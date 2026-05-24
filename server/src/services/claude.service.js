// Service pour appeler l'API Groq (compatible avec Anthropic messages API)

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

    // Si c'est la première fois (pas d'historique), ajouter le contexte initial
    if (messages.length === 0) {
      let initialContext = `Niveau d'urgence ${level}/4. ${LEVEL_CONTEXT[level]}`;

      // Ajouter les ressources disponibles
      if (contextObj.position) {
        initialContext += `\n📍 Localisation : ${contextObj.position.lat.toFixed(4)}, ${contextObj.position.lng.toFixed(4)}`;
      }
      if (contextObj.emergencyNumbers && contextObj.emergencyNumbers.length > 0) {
        const nums = contextObj.emergencyNumbers.slice(0, 3).map(e => `${e.number} (${e.name})`).join(', ');
        initialContext += `\n📞 Numéros disponibles : ${nums}`;
      }
      if (contextObj.nearbyPlaces && contextObj.nearbyPlaces.length > 0) {
        const places = contextObj.nearbyPlaces.slice(0, 3).map(p => `${p.name} (${p.type})`).join(', ');
        initialContext += `\n🏠 Lieux sûrs : ${places}`;
      }
      if (contextObj.vtcOptions && contextObj.vtcOptions.length > 0) {
        const vtc = contextObj.vtcOptions.map(v => v.n).join(', ');
        initialContext += `\n🚗 VTC disponibles : ${vtc}`;
      }

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
    }
    // Si on a déjà un historique, les messages sont déjà là (pas besoin d'ajouter initialContext)

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
    console.log('[Groq] Réponse réussie:', data.choices?.[0]?.message?.content?.substring(0, 100));
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

module.exports = { getAssistMessage, FALLBACK };
