export function extractYoutubeVideoID(input: string): string | null {
  if (!input) return null
  // If it's a plain ID (11 chars typical), accept alphanum/underscore/dash
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input

  try {
    const url = new URL(input)
    if (url.hostname.includes('youtube.com')) {
      if (url.pathname.startsWith('/shorts/')) {
        const id = url.pathname.split('/')[2]
        if (id && /^[a-zA-Z0-9_-]{11}$/.test(id)) return id
      }
      const v = url.searchParams.get('v')
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v
    }
    if (url.hostname.includes('youtu.be')) {
      const id = url.pathname.replace('/', '')
      if (id && /^[a-zA-Z0-9_-]{11}$/.test(id)) return id
    }
  } catch (_) {
    // not a URL, ignore
  }
  return null
}
