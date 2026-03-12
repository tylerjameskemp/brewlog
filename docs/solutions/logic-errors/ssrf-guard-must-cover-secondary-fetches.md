---
title: SSRF guard must cover secondary fetches from untrusted sources
category: logic-errors
module: worker
tags: [security, ssrf, fetch, worker, cloudflare]
severity: P1
symptoms:
  - Secondary fetch URL derived from untrusted response data
  - SSRF check only applied to primary URL, not follow-up requests
  - Transcript/API URLs extracted from page HTML used without validation
date: 2026-03-12
---

# SSRF guard must cover secondary fetches from untrusted sources

## Problem

When a worker fetches a URL and then extracts a secondary URL from the response to fetch again, the SSRF guard on the primary URL does not protect the secondary fetch. An attacker who controls the response content can embed a private/internal URL that bypasses the guard.

## Example

YouTube adapter fetches a watch page, parses `ytInitialPlayerResponse` JSON from the HTML, and extracts `preferredTrack.baseUrl` for the transcript. This URL comes from YouTube's embedded JavaScript — attacker-influenced content if someone controls or manipulates the video page. The original code fetched this URL with no SSRF check and no `redirect: 'error'`.

```js
// BEFORE — transcript URL fetched without SSRF check
async function fetchYouTubeTranscript(baseUrl) {
  const response = await fetch(`${baseUrl}&fmt=json3`, { ... })
  // baseUrl could be http://169.254.169.254/...
}
```

## Root Cause

The SSRF guard (`isPrivateUrl`) was applied once in the router before dispatching to source adapters. The mental model was "validate the user's URL, then trust everything downstream." But source adapters make secondary fetches using URLs extracted from untrusted response data, creating a second attack surface.

## Solution

Add a lightweight SSRF check before any secondary fetch that uses a URL derived from an untrusted source:

```js
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
    redirect: 'error',  // Also prevent redirect chains to internal targets
    ...
  })
}
```

## Prevention Checklist

1. **Audit every `fetch()` call** in source adapters — not just the primary URL fetch
2. **Any URL derived from response content** (JSON fields, HTML attributes, embedded JS) is untrusted
3. Apply SSRF check + `redirect: 'error'` to secondary fetches
4. When the secondary fetch is optional (like a transcript), fail gracefully (return empty) rather than throwing
5. Also validate URL format when interpolating user-derived values (e.g., video IDs) into fetch URLs
