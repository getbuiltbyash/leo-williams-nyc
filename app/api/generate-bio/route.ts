import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { q1, q2, q3 } = await req.json()

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `Write a professional, warm, first-person bio for Leo Williams, a NYC rental real estate salesperson at DiGiulio Group. 2-3 short paragraphs. No fluff, no clichés. Based on these answers:\n\n1. ${q1}\n2. ${q2}\n3. ${q3}\n\nWrite only the bio, no preamble.`
      }]
    })
  })

  const data = await res.json()
  const bio = data.content?.[0]?.text || ''
  return NextResponse.json({ bio })
}
