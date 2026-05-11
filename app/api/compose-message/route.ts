import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { type, inquiry } = await req.json()
  const isLandlord = inquiry.inquiry_type === 'landlord'

  const emailPrompt = isLandlord
    ? `You are Leo Williams, a NYC rental salesperson at DiGiulio Group. A landlord or property owner just submitted an inquiry. Write a short, warm, inquisitive email response that shows you've read their submission and want to learn more about their property. Ask 1-2 specific follow-up questions based on their details (neighborhood, message). Sound like a sharp agent who's genuinely interested in the listing opportunity — not a bot. Under 90 words. No subject line. Sign off as Leo.

Landlord details:
- Name: ${inquiry.first_name} ${inquiry.last_name}
- Neighborhood: ${inquiry.neighborhood || 'not specified'}
- Message: ${inquiry.message || 'none'}

Write ONLY the email body.`
    : `You are Leo Williams, a NYC rental salesperson at DiGiulio Group. A renter just submitted an inquiry. Write a short, warm, inquisitive email that shows you've actually read what they're looking for. Ask 1-2 smart follow-up questions based on their budget and neighborhood to help you find them the right place. Sound like a knowledgeable NYC agent, not a form response. Under 90 words. No subject line. Sign off as Leo.

Renter details:
- Name: ${inquiry.first_name} ${inquiry.last_name}
- Neighborhood interest: ${inquiry.neighborhood || 'flexible'}
- Budget: ${inquiry.budget || 'not specified'}
- Message: ${inquiry.message || 'none'}

Write ONLY the email body.`

  const smsPrompt = isLandlord
    ? `You are Leo Williams, a NYC rental salesperson. A landlord just reached out about their property. Write a short, conversational SMS that acknowledges their inquiry and asks one specific follow-up question about their property (e.g. unit size, availability, current rent). Friendly but professional. Under 35 words. No emojis. Sign off as Leo.

Landlord: ${inquiry.first_name} ${inquiry.last_name}
Neighborhood: ${inquiry.neighborhood || 'not specified'}
Message: ${inquiry.message || 'none'}

Write ONLY the SMS.`
    : `You are Leo Williams, a NYC rental salesperson. A renter just reached out. Write a short, conversational SMS that acknowledges what they're looking for and asks one smart follow-up question to help narrow down their search. Friendly but sharp. Under 35 words. No emojis. Sign off as Leo.

Renter: ${inquiry.first_name} ${inquiry.last_name}
Neighborhood: ${inquiry.neighborhood || 'flexible'}
Budget: ${inquiry.budget || 'not specified'}
Message: ${inquiry.message || 'none'}

Write ONLY the SMS.`

  const prompt = type === 'email' ? emailPrompt : smsPrompt

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 250,
      messages: [{ role: 'user', content: prompt }]
    })
  })

  const data = await res.json()
  return NextResponse.json({ message: data.content?.[0]?.text?.trim() || '' })
}
