import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { type, inquiry } = await req.json()
  const isLandlord = inquiry.inquiry_type === 'landlord'
  const name = inquiry.first_name

  const emailPrompt = isLandlord
    ? `You are Leo Williams, a licensed real estate salesperson at DiGiulio Group in New York City. Write a professional, concise email to a landlord who reached out about their property.

Do not introduce yourself by name in the body — your name will appear in the signature. Open with "Hi ${name}," on its own line, then "Thanks for reaching out." on the next line. Acknowledge their neighborhood and any details from their message. Ask one focused follow-up question about the unit (size, availability, or asking rent). End with "Looking forward to connecting," on its own line, then "Leo Williams" on the next line. No em dashes. No filler. Under 80 words total.

Landlord details:
- Name: ${name}
- Neighborhood: ${inquiry.neighborhood || 'not specified'}
- Move-in / availability: ${inquiry.move_in || 'not specified'}
- Message: ${inquiry.message || 'none provided'}

Write ONLY the email body including sign-off.`

    : `You are Leo Williams, a licensed real estate salesperson at DiGiulio Group in New York City. Write a professional, concise email to a prospective renter.

Do not introduce yourself by name in the body — your name will appear in the signature. Open with "Hi ${name}," on its own line, then "Thanks for reaching out." on the next line. Acknowledge exactly what they are looking for including move-in date if provided. If there is a mismatch between their listed neighborhood and what they described in their message, acknowledge the correct neighborhood from their message and ask if they are also open to the other one. Otherwise ask one smart follow-up question about timing or must-haves. End with "Looking forward to working with you," on its own line, then "Leo Williams" on the next line. No em dashes. No filler. No casual language. Under 90 words total.

Renter details:
- Name: ${name}
- Neighborhood/area interest: ${inquiry.neighborhood || 'not specified'}
- Budget: ${inquiry.budget || 'not specified'}
- Move-in date: ${inquiry.move_in || 'not specified'}
- Message: ${inquiry.message || 'none provided'}

Write ONLY the email body including sign-off.`

  const smsPrompt = isLandlord
    ? `You are Leo Williams, NYC real estate salesperson at DiGiulio Group. Write a professional SMS to a landlord. Start with "Hey [name], it's Leo Williams. I saw your inquiry come in through my site, leowilliamsnyc.com." Then acknowledge their property and ask one specific question. No emojis. No em dashes. Under 35 words.

Name: ${name}, Neighborhood: ${inquiry.neighborhood || 'not specified'}, Message: ${inquiry.message || 'none'}

Write ONLY the SMS.`.replace('[name]', name)

    : `You are Leo Williams, NYC real estate salesperson at DiGiulio Group. Write a professional SMS to a renter. Start with "Hey [name], it's Leo Williams. I saw your inquiry come in through my site, leowilliamsnyc.com." Then acknowledge what they need including move-in date. If neighborhood and message seem mismatched, ask which area they prefer. Otherwise ask one smart follow-up. No emojis. No em dashes. Under 35 words.

Name: ${name}, Neighborhood: ${inquiry.neighborhood || 'not specified'}, Budget: ${inquiry.budget || 'not specified'}, Move-in: ${inquiry.move_in || 'not specified'}, Message: ${inquiry.message || 'none'}

Write ONLY the SMS.`.replace('[name]', name)

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
