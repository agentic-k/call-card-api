import cheerio from 'https://esm.sh/cheerio@1.0.0-rc.12'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Parse request JSON
  let payload: { url?: string }
  try {
    payload = await req.json()
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const { url } = payload
  if (!url) {
    return new Response(
      JSON.stringify({ error: 'Missing `url` in request body' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Validate URL
  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
    if (!['https:', 'http:'].includes(parsedUrl.protocol)) throw new Error()
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid URL' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const resp = await fetch(parsedUrl.toString(), { redirect: 'manual' })
    if (resp.status !== 200) {
      throw new Error(`Fetch failed with status ${resp.status}`)
    }

    const html = await resp.text()
    const $ = cheerio.load(html)

    // Minimal scraping: only the data needed to understand services
    const title = $('head > title').text().trim()
    const metaDescription = $('head > meta[name="description"]').attr('content')?.trim() || ''
    const mainHeading = $('h1').first().text().trim()
    const subHeadings = $('h2').map((_, el) => $(el).text().trim()).get()
    const introParagraphs = $('p')
      .slice(0, 5) // limit to first 5 paragraphs
      .map((_, el) => $(el).text().trim())
      .get()

    const result = {
      title,
      metaDescription,
      headings: { mainHeading, subHeadings },
      introParagraphs,
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error('Scrape error:', err)
    return new Response(
      JSON.stringify({ error: 'Failed to scrape page' }),
      { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
