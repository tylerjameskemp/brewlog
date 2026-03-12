// ============================================================
// BREWLOG RECIPE IMPORT WORKER — thin router
// ============================================================
// Cloudflare Worker that extracts structured recipe data from
// pasted text (or URL) using Claude Haiku with output_config.
//
// Endpoints:
//   POST /extract  { text: "..." } or { url: "..." }
//   Returns: { recipes: [...] }

import { isYouTubeUrl, fetchYouTubeSource, InsufficientContentError } from './sources/youtube.js'
import { fetchArticleSource } from './sources/article.js'
import { extractTextSource } from './sources/text.js'
import { extractRecipes } from './extract/extractRecipes.js'

// --- CORS helpers ---

function corsHeaders(origin, allowedOrigin) {
  const isLocalDev = !allowedOrigin && origin && origin.startsWith('http://localhost:')
  const isAllowed = origin === allowedOrigin || isLocalDev

  return {
    'Access-Control-Allow-Origin': isAllowed ? (origin || '*') : (allowedOrigin || '*'),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  }
}

function jsonResponse(data, status, origin, allowedOrigin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(origin, allowedOrigin),
    },
  })
}

// --- SSRF protection ---

function isPrivateUrl(urlStr) {
  try {
    const url = new URL(urlStr)
    if (url.protocol !== 'https:') return true
    const hostname = url.hostname.toLowerCase()
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return true
    if (hostname.endsWith('.internal') || hostname.endsWith('.local')) return true
    if (hostname === 'metadata.google.internal' || hostname === '169.254.169.254') return true
    const parts = hostname.split('.')
    if (parts.length === 4 && parts.every(p => /^\d+$/.test(p))) {
      const [a, b] = parts.map(Number)
      if (a === 10) return true
      if (a === 172 && b >= 16 && b <= 31) return true
      if (a === 192 && b === 168) return true
      if (a === 127) return true
      if (a === 0) return true
    }
    return false
  } catch {
    return true
  }
}

// --- Main handler ---

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || ''
    const allowedOrigin = env.ALLOWED_ORIGIN || ''

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(origin, allowedOrigin),
      })
    }

    // Only POST /extract
    const url = new URL(request.url)
    if (request.method !== 'POST' || url.pathname !== '/extract') {
      return jsonResponse({ error: 'Not found' }, 404, origin, allowedOrigin)
    }

    // Auth check
    const authHeader = request.headers.get('Authorization') || ''
    const token = authHeader.replace(/^Bearer\s+/i, '')
    if (!env.WORKER_AUTH_TOKEN || token !== env.WORKER_AUTH_TOKEN) {
      return jsonResponse({ error: 'Unauthorized' }, 401, origin, allowedOrigin)
    }

    // Parse body
    let body
    try {
      body = await request.json()
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400, origin, allowedOrigin)
    }

    // Validate input
    const hasText = typeof body.text === 'string' && body.text.trim().length > 0
    const hasUrl = typeof body.url === 'string' && body.url.trim().length > 0
    if (!hasText && !hasUrl) {
      return jsonResponse({ error: 'Provide either "text" or "url"' }, 400, origin, allowedOrigin)
    }
    if (hasText && hasUrl) {
      return jsonResponse({ error: 'Provide "text" or "url", not both' }, 400, origin, allowedOrigin)
    }

    // Source dispatch
    let source
    if (hasUrl) {
      if (isPrivateUrl(body.url)) {
        return jsonResponse({ error: 'Invalid URL' }, 400, origin, allowedOrigin)
      }
      try {
        source = isYouTubeUrl(body.url)
          ? await fetchYouTubeSource(body.url)
          : await fetchArticleSource(body.url)
      } catch (err) {
        if (err instanceof InsufficientContentError) {
          return jsonResponse({ error: err.message }, 422, origin, allowedOrigin)
        }
        return jsonResponse({ error: 'Failed to fetch URL' }, 504, origin, allowedOrigin)
      }
    } else {
      source = extractTextSource(body.text)
    }

    // Optional grinder context from client
    const grinderName = typeof body.grinderName === 'string' ? body.grinderName.trim() : ''

    if (source.text.length < 10) {
      return jsonResponse({ error: 'Text too short to contain a recipe' }, 400, origin, allowedOrigin)
    }

    // Extract recipes
    if (!env.ANTHROPIC_API_KEY) {
      return jsonResponse({ error: 'Extraction service not configured' }, 502, origin, allowedOrigin)
    }

    try {
      const result = await extractRecipes(source.text, source.sourceType, {
        apiKey: env.ANTHROPIC_API_KEY,
        grinderName,
      })
      if (result.recipes.length === 0) {
        return jsonResponse({ error: 'No recipes found in the provided text' }, 422, origin, allowedOrigin)
      }
      return jsonResponse(result, 200, origin, allowedOrigin)
    } catch (err) {
      if (err.name === 'TimeoutError' || err.name === 'AbortError') {
        return jsonResponse({ error: 'Extraction timed out' }, 504, origin, allowedOrigin)
      }
      console.error('Extraction error:', err)
      return jsonResponse({ error: 'Extraction failed' }, 502, origin, allowedOrigin)
    }
  },
}
