import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { neighborhood, beds, baths, price, lease, concessions, amenities, notes } = await req.json()

  const prompt = `Write a short, warm, compelling NYC rental listing description. Under 85 words. Sound like a knowledgeable local agent who genuinely cares about finding the right tenant.

Rules:
- Never mention broker fees, no-fee, or OP paid
- Never mention the rent, price, or lease length
- Never use first person ("I", "we", "I'm confident", "I believe")
- Never make value judgments or claims about what the agent thinks
- Never use em dashes or hyphens to connect clauses
- No cliches like "don't miss out", "won't last long", "rare find"
- No filler phrases
- 3 to 4 direct, honest sentences about the apartment and neighborhood
- Write in second person (you, your)

Listing details:
- Neighborhood: ${neighborhood}
- Bedrooms: ${beds || 'Studio'}
- Bathrooms: ${baths || 'not specified'}
- Rent: ${price || 'not specified'}
- Lease: ${lease || 'not specified'}
- Amenities: ${amenities || 'none listed'}
- Concessions: ${concessions || 'none'}
- Extra notes: ${notes || 'none'}

Write ONLY the description. No headline. No bullets.`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }]
    })
  })
  const data = await res.json()
  return NextResponse.json({ description: data.content?.[0]?.text?.trim() || '' })
}
