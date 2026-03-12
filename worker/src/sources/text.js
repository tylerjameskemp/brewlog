// ============================================================
// TEXT SOURCE ADAPTER — direct pasted text
// ============================================================

export function extractTextSource(text) {
  return { text: text.trim().slice(0, 12000), sourceType: 'text' }
}
