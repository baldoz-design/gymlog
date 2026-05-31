const PROMPT = `Analizza questa immagine di una lavagna di una palestra.
Estrai il programma di allenamento nel seguente formato JSON:

{
  "slots": {
    "MON_TUE": {
      "blocks": [
        {
          "label": "A",
          "exercises": [
            { "position": 1, "name": "Split Squat" },
            { "position": 2, "name": "Chin Up" },
            { "position": 3, "name": "Deadbug" }
          ]
        }
      ]
    },
    "WED_THU": { },
    "FRI_SAT": { }
  },
  "warnings": []
}

Regole:
- Usa i nomi esattamente come scritti sulla lavagna, senza interpretare o tradurre.
- LUN/MAR = MON_TUE, MER/GIO = WED_THU, VEN/SAB = FRI_SAT.
- Se un blocco ha 2 esercizi, inserisci solo 2. Se ne ha 3, inserisci 3.
- Se una sezione non è leggibile, omettila e segnalala in "warnings".
- Aggiungi in "warnings" eventuali nomi di difficile lettura o ambiguità.
- Rispondi SOLO con il JSON, senza testo aggiuntivo.`;

function extractJson(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Nessun JSON trovato nella risposta');
  return JSON.parse(match[0]);
}

export async function extractProgramFromImage(base64Image, mediaType, provider, apiKey) {
  if (provider === 'gemini') {
    return callGemini(base64Image, mediaType, apiKey);
  }
  return callClaude(base64Image, mediaType, apiKey);
}

async function callClaude(base64Image, mediaType, apiKey) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'anthropic-dangerous-allow-browser': 'true',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-5',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64Image } },
          { type: 'text', text: PROMPT },
        ],
      }],
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Errore Claude API: ${res.status}`);
  }
  const data = await res.json();
  return extractJson(data.content?.[0]?.text || '');
}

async function callGemini(base64Image, mediaType, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { inline_data: { mime_type: mediaType, data: base64Image } },
          { text: PROMPT },
        ],
      }],
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Errore Gemini API: ${res.status}`);
  }
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return extractJson(text);
}
