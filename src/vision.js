/**
 * vision.js — analisi immagine lavagna con Claude Vision API.
 * Chiave letta da import.meta.env.VITE_CLAUDE_API_KEY (file .env.local).
 */

const CLAUDE_API_KEY = import.meta.env.VITE_CLAUDE_API_KEY || '';

const PROMPT = `Sei un assistente per il tracciamento degli allenamenti. Analizza questa foto di una lavagna di una palestra e estrai il programma di allenamento.

Il programma è organizzato in 3 slot settimanali (LUN/MAR, MER/GIO, VEN/SAB), ognuno con blocchi (A, B, C) e sotto-esercizi numerati (A1, A2, A3, ecc.).

Rispondi SOLO con un oggetto JSON nel formato esatto:
{
  "slots": {
    "MON_TUE": {
      "blocks": [
        {
          "label": "A",
          "exercises": [
            { "position": 1, "name": "Nome Esercizio" },
            { "position": 2, "name": "Nome Esercizio" }
          ]
        }
      ]
    },
    "WED_THU": { "blocks": [...] },
    "FRI_SAT": { "blocks": [...] }
  },
  "warnings": ["eventuale avviso se qualcosa non è leggibile"]
}

Regole:
- Trascrivi i nomi degli esercizi così come appaiono sulla lavagna
- Se un nome è parzialmente illeggibile, trascrivilo al meglio e aggiungi un warning
- Non inventare esercizi non presenti nell'immagine
- Se uno slot non è visibile, omettilo dall'output`;

export async function extractProgramFromImage(base64, mediaType) {
  if (!CLAUDE_API_KEY) {
    throw new Error('Chiave Claude non configurata. Aggiungi VITE_CLAUDE_API_KEY nel file .env.local');
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-5',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: base64 },
          },
          { type: 'text', text: PROMPT },
        ],
      }],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Errore API Claude (${response.status})`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text || '';

  // Estrae il JSON dalla risposta (Claude a volte aggiunge testo prima/dopo)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Claude non ha restituito un JSON valido. Riprova.');

  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error('Errore nel parsing della risposta. Riprova con una foto più nitida.');
  }
}
