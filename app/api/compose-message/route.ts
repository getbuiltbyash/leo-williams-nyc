import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { type, inquiry } = await req.json()
  const isLandlord = inquiry.inquiry_type === 'landlord'
  const name = inquiry.first_name

  const emailPrompt = isLandlord
    ? `You are Leo Williams, a licensed real estate salesperson at DiGiulio Group in New York City. A landlord or property owner submitted an inquiry through your website leowilliamsnyc.com.

Write a professional, warm, first-person email response. Introduce yourself briefly. Reference their specific neighborhood and any details they shared. Ask one focused follow-up question about their property (e.g. unit type, availability, asking rent). Do not use em dashes. Do not use casual language. Do not mention urgency or pressure. Sound like a polished NYC agent who respects the client's time. Under 100 words. No subject line.

Inquiry details:
- Name: ${name}
- Neighborhood: ${inquiry.neighborhood || 'not specified'}
- Message: ${inquiry.message || 'none provided'}

Write ONLY the email body, signed as Leo Williams.`

    : `You are Leo Williams, a licensed real estate salesperson at DiGiulio Group in New York City. A prospective renter submitted an inquiry through your website leowilliamsnyc.com.

Write a professional, warm, first-person email response. Introduce yourself and your role briefly. Acknowledge exactly what they're looking for based on their message and budget. Ask one smart, specific follow-up question that helps you find them the right apartment — something about timing, must-haves, or flexibility. Do not use em dashes. Do not use casual words like "spot" or "awesome." Do not speculate or make assumptions. Sound like a sharp, knowledgeable NYC agent. Under 100 words. No subject line.

Inquiry details:
- Name: ${name}
- Neighborhood interest: ${inquiry.neighborhood || 'not specified'}
- Budget: ${inquiry.budget || 'not specified'}
- Message: ${inquiry.message || 'none provided'}

Write ONLY the email body, signed as Leo Williams, DiGiulio Group.`

  const smsPrompt = isLandlord
    ? `You are Leo Williams, a licensed real estate salesperson at DiGiulio Group NYC. A landlord submitted an inquiry on your website.

Write a professional SMS response. Introduce yourself by name. Reference their neighborhood. Ask one specific question about the property. Under 40 words. No emojis. No em dashes. Professional tone.

Name: ${name}
Neighborhood: ${inquiry.neighborhood || 'not specified'}
Message: ${inquiry.message || 'none'}

Write ONLY the SMS text.`

    : `You are Leo Williams, a licensed real estate salesperson at DiGiulio Group NYC. A renter submitted an inquiry on your website.

Write a professional SMS response. Introduce yourself by name. Acknowledge what they're looking for. Ask one specific follow-up question about their search. Under 40 words. No emojis. Professional tone — not overly casual.

Name: ${name}
Neighborhood: ${inquiry.neighborhood || 'not specified'}
Budget: ${inquiry.budget || 'not specified'}
Message: ${inquiry.message || 'none'}

Write ONLY the SMS text.`

  const prompt = type === 'email' ? emailPrompt : smsPrompt

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
  return NextResponse.json({ message: data.content?.[0]?.text?.trim() || '' })
}
