import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { type, inquiry } = await req.json()
    const isLandlord = inquiry.inquiry_type === 'landlord'
    const firstName = (inquiry.first_name || 'there').trim()
    const neighborhood = inquiry.neighborhood || 'not specified'
    const budget = inquiry.budget || 'not specified'
    const moveIn = inquiry.move_in || 'flexible'
    const message = inquiry.message || 'none provided'

    let prompt = ''

    if (type === 'email' && isLandlord) {
      prompt = `You are Leo Williams, licensed real estate salesperson at DiGiulio Group NYC. Write a professional email to a landlord named ${firstName}.

Open with: Hi ${firstName},
Then: Thanks for reaching out.
Body: Reference their neighborhood (${neighborhood}) and message. Ask one follow-up question about unit size, availability, or asking rent.
Close with: Looking forward to connecting,
Leo Williams

No em dashes. No filler. Under 80 words. Write ONLY the email body.

Their message: ${message}`

    } else if (type === 'email' && !isLandlord) {
      prompt = `You are Leo Williams, licensed real estate salesperson at DiGiulio Group NYC. Write a professional email to a renter named ${firstName}.

Open with: Hi ${firstName},
Then: Thanks for reaching out.
Body: Reference what they are looking for in natural language — do NOT quote their message verbatim. If neighborhood listed (${neighborhood}) differs from what they described in their message, note it and ask which they prefer. Otherwise ask one smart follow-up about timing or must-haves.
Close with: Looking forward to working with you,
Leo Williams

No em dashes. No filler. No casual language. Under 90 words. Write ONLY the email body.

Details — Neighborhood: ${neighborhood}, Budget: ${budget}, Move-in: ${moveIn}, Message: ${message}`

    } else if (type === 'sms' && isLandlord) {
      prompt = `You are Leo Williams, licensed real estate salesperson at DiGiulio Group NYC. Write a brief SMS to a landlord named ${firstName}.

Start with exactly: Hey ${firstName}, it's Leo Williams. I saw your inquiry come in through my site, leowilliamsnyc.com.
Then: Reference their property in ${neighborhood} and ask one specific question.
No emojis. No em dashes. Under 40 words total. Write ONLY the SMS.

Their message: ${message}`

    } else {
      prompt = `You are Leo Williams, licensed real estate salesperson at DiGiulio Group NYC. Write a brief SMS to a renter named ${firstName}.

Start with exactly: Hey ${firstName}, it's Leo Williams. I saw your inquiry come in through my site, leowilliamsnyc.com.
Then: In natural language reference what they are looking for — do NOT use phrases like "you need X" or quote their message back. If neighborhood (${neighborhood}) and message point to different areas ask which they prefer. Otherwise ask one smart follow-up.
No emojis. No em dashes. Under 40 words total. Write ONLY the SMS.

Details — Neighborhood: ${neighborhood}, Budget: ${budget}, Move-in: ${moveIn}, Message: ${message}`
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }]
      })
    })

    const data = await res.json()
    if (!res.ok) {
      console.error('Anthropic API error:', JSON.stringify(data))
      return NextResponse.json({ message: '' }, { status: 500 })
    }
    return NextResponse.json({ message: data.content?.[0]?.text?.trim() || '' })
  } catch (e) {
    console.error('compose error:', e)
    return NextResponse.json({ message: '' }, { status: 500 })
  }
}
