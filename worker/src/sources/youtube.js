// ============================================================
// YOUTUBE SOURCE ADAPTER — transcript + description extraction
// ============================================================

import {
  normalizeWhitespace,
  extractTitle,
  extractJsonAssignment,
  looksRecipeLike,
  checkResponseSize,
  USER_AGENT,
  FETCH_TIMEOUT_MS,
  MAX_SOURCE_TEXT_LENGTH,
} from '../utils.js'

export class InsufficientContentError extends Error {
  constructor(message) {
    super(message)
    this.name = 'InsufficientContentError'
  }
}

const YOUTUBE_VIDEO_ID_RE = /^[a-zA-Z0-9_-]{10,12}$/

export function isYouTubeUrl(urlStr) {
  try {
    const url = new URL(urlStr)
    const hostname = url.hostname.toLowerCase()
    return hostname === 'youtu.be'
      || hostname === 'youtube.com' || hostname.endsWith('.youtube.com')
      || hostname === 'youtube-nocookie.com' || hostname.endsWith('.youtube-nocookie.com')
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

function isPrivateTranscriptUrl(urlStr) {
  try {
    const url = new URL(urlStr)
    if (url.protocol !== 'https:') return true
    const hostname = url.hostname.toLowerCase()
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return true
    if (hostname.endsWith('.internal') || hostname.endsWith('.local')) return true
    return false
  } catch {
    return true
  }
}

async function fetchYouTubeTranscript(baseUrl) {
  if (isPrivateTranscriptUrl(baseUrl)) return ''
  const response = await fetch(`${baseUrl}&fmt=json3`, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept-Language': 'en-US,en;q=0.9',
    },
    redirect: 'error',
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  })
  if (!response.ok) {
    console.warn(`YouTube transcript fetch failed: ${response.status}`)
    return ''
  }
  checkResponseSize(response)
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
  if (!videoId || !YOUTUBE_VIDEO_ID_RE.test(videoId)) throw new Error('Invalid YouTube URL')

  const response = await fetch(`https://www.youtube.com/watch?v=${videoId}&hl=en`, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept-Language': 'en-US,en;q=0.9',
    },
    redirect: 'error',
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  })
  if (!response.ok) throw new Error(`YouTube fetch failed: ${response.status}`)
  checkResponseSize(response)

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
    text: normalizeWhitespace(sections.join('\n\n')).slice(0, MAX_SOURCE_TEXT_LENGTH),
    sourceType: 'youtube',
  }
}
