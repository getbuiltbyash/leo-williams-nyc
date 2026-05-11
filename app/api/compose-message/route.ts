import { NextRequest, NextResponse } from 'next/server'
export async function POST(req: NextRequest) {
  const { type, inquiry } = await req.json()
  const prompts: Record<string,string> = {
    email: `Write a short, professional, warm email from Leo Williams (NYC rental agent at DiGiulio Group) responding to this inquiry. Be personable, not salesy. Under 100 words. No subject line.\n\nInquiry from: ${inquiry.first_name} ${inquiry.last_name}\nType: ${inquiry.inquiry_type==='landlord'?'Landlord/Property Owner':'Renter'}\nNeighborhood: ${inquiry.neighborhood||'flexible'}\nBudget: ${inquiry.budget||'not specified'}\nMessage: ${inquiry.message||'none'}\n\nWrite ONLY the email body.`,
    sms: `Write a short friendly SMS from Leo Williams (NYC rental agent) responding to this inquiry. Casual but professional. Under 40 words. No emojis.\n\nFrom: ${inquiry.first_name} ${inquiry.last_name}\nType: ${inquiry.inquiry_type==='landlord'?'Landlord':'Renter'}\nNeighborhood: ${inquiry.neighborhood||'flexible'}\nMessage: ${inquiry.message||'none'}\n\nWrite ONLY the SMS text.`
  }
  const res = await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':process.env.ANTHROPIC_API_KEY!,'anthropic-version':'2023-06-01'},body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:200,messages:[{role:'user',content:prompts[type]}]})})
  const data = await res.json()
  return NextResponse.json({ message: data.content?.[0]?.text?.trim()||'' })
}
