// ============================================================
// SHARED UTILITIES — pure text/HTML helpers + shared constants
// ============================================================

export const USER_AGENT = 'BrewLog Recipe Importer/1.0'
export const FETCH_TIMEOUT_MS = 10000
export const MAX_SOURCE_TEXT_LENGTH = 12000
export const MAX_RESPONSE_BYTES = 2_000_000

export function checkResponseSize(response) {
  const contentLength = response.headers.get('content-length')
  if (contentLength && parseInt(contentLength, 10) > MAX_RESPONSE_BYTES) {
    throw new Error('Response too large')
  }
}

export function decodeHtmlEntities(text = '') {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
}

export function normalizeWhitespace(text = '') {
  return text
    .replace(/\r/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

export function stripHtml(html = '') {
  const withLineBreaks = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|section|article|main|li|ul|ol|h[1-6])>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '\n- ')
  return normalizeWhitespace(decodeHtmlEntities(withLineBreaks.replace(/<[^>]+>/g, ' ')))
}

export function extractMetaContent(html, attr, value) {
  const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const patterns = [
    new RegExp(`<meta[^>]+${attr}=["']${escapedValue}["'][^>]+content=["']([\\s\\S]*?)["'][^>]*>`, 'i'),
    new RegExp(`<meta[^>]+content=["']([\\s\\S]*?)["'][^>]+${attr}=["']${escapedValue}["'][^>]*>`, 'i'),
  ]
  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match?.[1]) return normalizeWhitespace(decodeHtmlEntities(match[1]))
  }
  return ''
}

export function extractTitle(html) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return match?.[1] ? normalizeWhitespace(decodeHtmlEntities(match[1])) : ''
}

export function collectJsonLdText(node, output) {
  if (!node) return
  if (Array.isArray(node)) {
    node.forEach(item => collectJsonLdText(item, output))
    return
  }
  if (typeof node !== 'object') return

  const keys = ['headline', 'name', 'description', 'articleBody', 'text']
  keys.forEach(key => {
    if (typeof node[key] === 'string') {
      output.push(normalizeWhitespace(decodeHtmlEntities(node[key])))
    }
  })

  Object.values(node).forEach(value => {
    if (value && typeof value === 'object') collectJsonLdText(value, output)
  })
}

export function extractJsonLdTexts(html) {
  const matches = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)
  const texts = []
  for (const match of matches) {
    const raw = match[1]?.trim()
    if (!raw) continue
    try {
      collectJsonLdText(JSON.parse(raw), texts)
    } catch {
      // Ignore malformed JSON-LD blobs.
    }
  }
  return [...new Set(texts.filter(Boolean))]
}

export function recipeSignalScore(text = '') {
  const lower = text.toLowerCase()
  const keywordHits = [
    /\bbloom\b/g,
    /\bpour\b/g,
    /\brecipe\b/g,
    /\bcoffee\b/g,
    /\bwater\b/g,
    /\bgrind\b/g,
    /\btemp(?:erature)?\b/g,
    /\bratio\b/g,
    /\bdrawdown\b/g,
    /\bg\b/g,
  ].reduce((count, pattern) => count + ((lower.match(pattern) || []).length > 0 ? 1 : 0), 0)
  const numericSignals = (text.match(/\b\d+(?:\.\d+)?\s?(?:g|grams|ml|c|f|seconds?|sec|minutes?|min)\b/gi) || []).length
  return (keywordHits * 2) + numericSignals
}

export function looksRecipeLike(text = '') {
  return recipeSignalScore(text) >= 5
}

export function removeCommonNoise(html) {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<template[^>]*>[\s\S]*?<\/template>/gi, ' ')
    .replace(/<(nav|header|footer|aside|form)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
}

export function extractArticleText(html) {
  const cleaned = removeCommonNoise(html)
  const candidates = []
  const articleMatch = cleaned.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)
  const mainMatch = cleaned.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)
  const bodyMatch = cleaned.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)

  ;[articleMatch?.[1], mainMatch?.[1], bodyMatch?.[1], cleaned].forEach(fragment => {
    if (!fragment) return
    const text = stripHtml(fragment)
    if (text) candidates.push(text)
  })

  candidates.sort((a, b) => recipeSignalScore(b) - recipeSignalScore(a) || b.length - a.length)
  return candidates[0] || ''
}

export function extractBalancedJson(text, startIndex) {
  let depth = 0
  let inString = false
  let escaped = false

  for (let i = startIndex; i < text.length; i++) {
    const char = text[i]
    if (inString) {
      if (escaped) {
        escaped = false
      } else if (char === '\\') {
        escaped = true
      } else if (char === '"') {
        inString = false
      }
      continue
    }

    if (char === '"') {
      inString = true
      continue
    }
    if (char === '{') depth++
    if (char === '}') {
      depth--
      if (depth === 0) {
        return text.slice(startIndex, i + 1)
      }
    }
  }

  return ''
}

export function extractJsonAssignment(rawHtml, variableName) {
  const marker = `${variableName} = `
  const markerIndex = rawHtml.indexOf(marker)
  if (markerIndex === -1) return null
  const jsonStart = rawHtml.indexOf('{', markerIndex)
  if (jsonStart === -1) return null
  const jsonText = extractBalancedJson(rawHtml, jsonStart)
  if (!jsonText) return null
  try {
    return JSON.parse(jsonText)
  } catch {
    return null
  }
}
