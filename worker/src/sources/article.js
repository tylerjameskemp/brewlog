// ============================================================
// ARTICLE SOURCE ADAPTER — URL fetch + HTML extraction
// ============================================================

import {
  extractTitle,
  extractMetaContent,
  extractJsonLdTexts,
  extractArticleText,
  normalizeWhitespace,
} from '../utils.js'

function buildArticleSourceText(url, rawHtml) {
  const title = extractTitle(rawHtml)
  const metaTexts = [
    extractMetaContent(rawHtml, 'name', 'description'),
    extractMetaContent(rawHtml, 'property', 'og:description'),
    extractMetaContent(rawHtml, 'name', 'twitter:description'),
  ].filter(Boolean)
  const jsonLdTexts = extractJsonLdTexts(rawHtml)
  const articleText = extractArticleText(rawHtml)

  const sections = []
  if (title) sections.push(`Source title:\n${title}`)
  if (metaTexts.length > 0) sections.push(`Source summary:\n${metaTexts.join('\n')}`)
  if (jsonLdTexts.length > 0) sections.push(`Structured page text:\n${jsonLdTexts.join('\n\n')}`)
  if (articleText) sections.push(`Page text:\n${articleText}`)
  sections.push(`Source URL:\n${url}`)

  return normalizeWhitespace(sections.join('\n\n')).slice(0, 12000)
}

export async function fetchArticleSource(url) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'BrewLog Recipe Importer/1.0' },
    redirect: 'error',
    signal: AbortSignal.timeout(10000),
  })
  if (!response.ok) throw new Error(`URL fetch failed: ${response.status}`)
  const rawHtml = await response.text()
  return { text: buildArticleSourceText(url, rawHtml), sourceType: 'article' }
}
