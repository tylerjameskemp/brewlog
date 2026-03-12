// ============================================================
// YOUTUBE SOURCE ADAPTER — transcript + description extraction
// ============================================================

import {
  normalizeWhitespace,
  extractTitle,
  extractJsonAssignment,
  looksRecipeLike,
} from '../utils.js'

export class InsufficientContentError extends Error {
  constructor(message) {
    super(message)
    this.name = 'InsufficientContentError'
  }
}

export function isYouTubeUrl(urlStr) {
  try {
    const url = new URL(urlStr)
    const hostname = url.hostname.toLowerCase()
    return hostname === 'youtu.be' || hostname.endsWith('youtube.com') || hostname.endsWith('youtube-nocookie.com')
  } catch {
    return false
  }
}

function getYouTubeVideoId(urlStr) {
  try {
    const url = new URL(urlStr)
    const hostname = url.hostname.toLowerCase()
    if (hostname === 'youtu.be') return url.pathname.slice(1)
    if (url.pathname === '/watch') return url.searchParams.get('v')
    const parts = url.pathname.split('/').filter(Boolean)
    if (parts[0] === 'shorts' || parts[0] === 'embed') return parts[1] || ''
    return ''
  } catch {
    return ''
  }
}

function parseYouTubeTranscriptJson(text) {
  try {
    const payload = JSON.parse(text)
    const lines = []
    for (const event of payload.events || []) {
      const line = (event.segs || [])
        .map(seg => seg.utf8 || '')
        .join('')
        .replace(/\s+/g, ' ')
        .trim()
      if (line) lines.push(line)
    }
    return normalizeWhitespace(lines.join('\n'))
  } catch {
    return ''
  }
}

async function fetchYouTubeTranscript(baseUrl) {
  const response = await fetch(`${baseUrl}&fmt=json3`, {
    headers: {
      'User-Agent': 'BrewLog Recipe Importer/1.0',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    signal: AbortSignal.timeout(10000),
  })
  if (!response.ok) return ''
  const body = await response.text()
  if (!body) return ''
  return parseYouTubeTranscriptJson(body)
}

/**
 * Fetch YouTube source text from a video URL.
 *
 * @param {string} url - YouTube URL
 * @returns {Promise<{ text: string, sourceType: 'youtube' }>}
 * @throws {InsufficientContentError} When no transcript and description is not recipe-like
 * @throws {Error} On invalid URL or fetch failure
 */
export async function fetchYouTubeSource(url) {
  const videoId = getYouTubeVideoId(url)
  if (!videoId) throw new Error('Invalid YouTube URL')

  const response = await fetch(`https://www.youtube.com/watch?v=${videoId}&hl=en`, {
    headers: {
      'User-Agent': 'BrewLog Recipe Importer/1.0',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    redirect: 'error',
    signal: AbortSignal.timeout(10000),
  })
  if (!response.ok) throw new Error(`YouTube fetch failed: ${response.status}`)

  const rawHtml = await response.text()
  const playerResponse = extractJsonAssignment(rawHtml, 'ytInitialPlayerResponse')
  const videoDetails = playerResponse?.videoDetails || {}
  const title = normalizeWhitespace(videoDetails.title || extractTitle(rawHtml))
  const description = normalizeWhitespace(videoDetails.shortDescription || '')

  const tracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks || []
  const preferredTrack =
    tracks.find(track => track.languageCode === 'en' && !track.kind) ||
    tracks.find(track => track.languageCode === 'en') ||
    tracks[0]
  const transcript = preferredTrack?.baseUrl ? await fetchYouTubeTranscript(preferredTrack.baseUrl) : ''

  if (!transcript && !looksRecipeLike(description)) {
    throw new InsufficientContentError(
      'No transcript or recipe details found for this YouTube video. Paste the transcript or recipe text directly.'
    )
  }

  const sections = []
  if (title) sections.push(`YouTube title:\n${title}`)
  if (description) sections.push(`YouTube description:\n${description}`)
  if (transcript) sections.push(`YouTube transcript:\n${transcript}`)

  return {
    text: normalizeWhitespace(sections.join('\n\n')).slice(0, 12000),
    sourceType: 'youtube',
  }
}
