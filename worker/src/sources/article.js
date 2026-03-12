// ============================================================
// ARTICLE SOURCE ADAPTER — URL fetch + HTML extraction
// ============================================================

import {
  extractTitle,
  extractMetaContent,
  extractJsonLdTexts,
  extractArticleText,
  normalizeWhitespace,
  isPrivateUrl,
  readBoundedBody,
  USER_AGENT,
  FETCH_TIMEOUT_MS,
  MAX_SOURCE_TEXT_LENGTH,
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

  return normalizeWhitespace(sections.join('\n\n')).slice(0, MAX_SOURCE_TEXT_LENGTH)
}

export async function fetchArticleSource(url) {
  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    redirect: 'follow',
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  })
  if (!response.ok) throw new Error(`URL fetch failed: ${response.status}`)
  // Validate final URL after redirects to prevent SSRF via redirect chain
  if (isPrivateUrl(response.url)) throw new Error('Redirected to private URL')
  const rawHtml = await readBoundedBody(response)
  return { text: buildArticleSourceText(url, rawHtml), sourceType: 'article' }
}
