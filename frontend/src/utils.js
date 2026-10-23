/** Label a transcript as Hindi, English, or a mix, based on the scripts used. */
export function detectLanguage(text) {
  const hasHindi = /[\u0900-\u097F]/.test(text);
  const hasLatin = /[A-Za-z]/.test(text);
  if (hasHindi && hasLatin) return 'Hindi + English';
  if (hasHindi) return 'Hindi';
  if (hasLatin) return 'English';
  return 'Multilingual';
}

export function formatDuration(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function formatDate(iso) {
  return new Date(iso).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}
