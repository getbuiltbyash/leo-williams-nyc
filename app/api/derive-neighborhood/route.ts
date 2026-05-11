import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { address } = await req.json()
  
  try {
    // Use Nominatim (OpenStreetMap) for accurate geocoding
    const query = encodeURIComponent(`${address}, New York City`)
    const geoRes = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${query}&format=json&addressdetails=1&limit=1`,
      { headers: { 'User-Agent': 'LeoWilliamsNYC/1.0' } }
    )
    const geoData = await geoRes.json()
    
    if (geoData && geoData[0]) {
      const addr = geoData[0].address
      // Nominatim returns neighborhood in various fields - try them in order
      const neighborhood = 
        addr.neighbourhood ||
        addr.suburb ||
        addr.quarter ||
        addr.city_district ||
        addr.district ||
        null

      if (neighborhood) {
        return NextResponse.json({ neighborhood })
      }
    }

    // Fallback: ask Claude only if geocoding fails
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY!, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 50,
        messages: [{ role: 'user', content: `What is the exact NYC neighborhood for this address? Return ONLY the neighborhood name (e.g. "Nolita", "Hell's Kitchen", "Williamsburg"), nothing else.\n\nAddress: ${address}` }]
      })
    })
    const data = await res.json()
    return NextResponse.json({ neighborhood: data.content?.[0]?.text?.trim() || '' })

  } catch (e) {
    console.error(e)
    return NextResponse.json({ neighborhood: '' })
  }
}
