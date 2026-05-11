import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { neighborhood, amenities, beds, price } = await req.json()

    const prompt = `You are a NYC real estate expert. Given this rental listing, pick the 3 most compelling amenities to feature on the listing card — the ones that would make a renter stop scrolling.

Listing details:
- Neighborhood: ${neighborhood}
- Bedrooms: ${beds || 'not specified'}
- Price: ${price || 'not specified'}
- All amenities: ${amenities?.join(', ') || 'none listed'}

Rules:
- Only pick from the amenities listed above — do not invent new ones
- Pick the 3 that are most desirable and rare for this neighborhood and price point
- A private outdoor space, doorman, in-unit laundry, or no-fee badge always wins if present
- Return ONLY a JSON array of exactly 3 strings, no explanation, no markdown. Example: ["In-unit laundry","Doorman","Private terrace"]`

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 100,
        messages: [{ role: 'user', content: prompt }]
      })
    })

    const data = await res.json()
    const text = data.content?.[0]?.text?.trim() || '[]'
    const suggestions = JSON.parse(text)
    return NextResponse.json({ suggestions })
  } catch (e) {
    console.error('suggest-amenities error:', e)
    return NextResponse.json({ suggestions: [] })
  }
}
