// supabase/functions/scrape-url/index.ts

import cheerio from 'https://esm.sh/cheerio@1.0.0-rc.12'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
}

Deno.serve(async (req: Request) => {
  console.log('▶️ incoming method', req.method);

  if (req.method === 'OPTIONS') {
    console.log('▶️ accepted options');
    return new Response(null, { headers: corsHeaders })
  }

  console.log('▶️ accepted options');

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  console.log('▶️ started processing');

  // Parse body
  let payload: { url?: string; selectors?: Record<string, string> }
  try {
    payload = await req.json()
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const { url, selectors } = payload
  if (!url) {
    return new Response(
      JSON.stringify({ error: 'Missing `url` in request body' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  let parsed: URL
  try {
    parsed = new URL(url)
    if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error()
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid URL' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const resp = await fetch(parsed.toString(), { redirect: 'manual' })
    if (resp.status !== 200) {
      throw new Error(`Fetch failed with status ${resp.status}`)
    }
    const html = await resp.text()
    const $ = cheerio.load(html)

    // Basic page info
    const title = $('head > title').text().trim()
    const metaDescription =
      $('head > meta[name="description"]').attr('content')?.trim() || ''

    // Headings
    const h1 = $('h1').first().text().trim()
    const h2 = $('h2')
      .map((_, el) => $(el).text().trim())
      .get()

    // Paragraphs & list items
    const paragraphs = $('p')
      .map((_, el) => $(el).text().trim())
      .get()
    const listItems = $('li')
      .map((_, el) => $(el).text().trim())
      .get()

    // Links
    const links = $('a')
      .map((_, el) => ({
        text: $(el).text().trim(),
        href: $(el).attr('href') || ''
      }))
      .get()

    // Table rows
    const tables = $('table tr')
      .map((_, row) => {
        const cells = $(row)
          .find('td, th')
          .map((_, cell) => $(cell).text().trim())
          .get()
        return cells
      })
      .get()

    // JSON-LD structured data
    const jsonLd = $('script[type="application/ld+json"]')
      .map((_, el) => {
        try {
          return JSON.parse($(el).html() || '')
        } catch {
          return null
        }
      })
      .get()
      .filter(item => item !== null)

    // Open Graph & Twitter Card tags
    const ogTags: Record<string,string> = {}
    $('head meta[property^="og:"]').each((_, el) => {
      const property = $(el).attr('property')!
      const content = $(el).attr('content') || ''
      ogTags[property] = content
    })
    const twitterTags: Record<string,string> = {}
    $('head meta[name^="twitter:"]').each((_, el) => {
      const name = $(el).attr('name')!
      const content = $(el).attr('content') || ''
      twitterTags[name] = content
    })

    // User-defined selectors
    const custom: Record<string, any[]> = {}
    if (selectors && typeof selectors === 'object') {
      for (const [key, sel] of Object.entries(selectors)) {
        custom[key] = $(sel)
          .map((_, el) => $(el).text().trim())
          .get()
      }
    }

    const result = {
      title,
      metaDescription,
      headings: { h1, h2 },
      paragraphs,
      listItems,
      links,
      tables,
      jsonLd,
      ogTags,
      twitterTags,
      custom
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err: any) {
    console.error('Scrape error:', err)
    return new Response(
      JSON.stringify({ error: 'Failed to scrape page' }),
      { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
