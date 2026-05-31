/**
 * Distanza di Levenshtein normalizzata (0 = identico, 1 = completamente diverso)
 */
function levenshtein(a, b) {
  const la = a.length, lb = b.length;
  if (la === 0) return lb;
  if (lb === 0) return la;
  const dp = Array.from({ length: la + 1 }, (_, i) => [i]);
  for (let j = 1; j <= lb; j++) dp[0][j] = j;
  for (let i = 1; i <= la; i++) {
    for (let j = 1; j <= lb; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[la][lb];
}

function similarity(a, b) {
  const dist = levenshtein(a.toLowerCase(), b.toLowerCase());
  return 1 - dist / Math.max(a.length, b.length);
}

/**
 * Confronta un nome estratto con la libreria di esercizi esistenti.
 * Ritorna: { status, match }
 *   status: 'exact' | 'fuzzy' | 'new'
 *   match: Exercise | null
 */
export function matchExercise(extractedName, existingExercises) {
  // 1. Confronto esatto (case insensitive)
  const exact = existingExercises.find(
    e => e.canonicalName.toLowerCase() === extractedName.toLowerCase()
  );
  if (exact) return { status: 'exact', match: exact };

  // 2. Fuzzy > 80%
  let best = null;
  let bestScore = 0;
  for (const ex of existingExercises) {
    const score = similarity(extractedName, ex.canonicalName);
    if (score > bestScore) { bestScore = score; best = ex; }
  }

  if (bestScore >= 0.8) return { status: 'fuzzy', match: best, score: bestScore };

  return { status: 'new', match: null };
}
