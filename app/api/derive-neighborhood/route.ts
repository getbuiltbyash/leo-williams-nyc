import { NextRequest, NextResponse } from 'next/server'
export async function POST(req: NextRequest) {
  const { address } = await req.json()
  const res = await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':process.env.ANTHROPIC_API_KEY!,'anthropic-version':'2023-06-01'},body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:50,messages:[{role:'user',content:`What NYC neighborhood is this address in? Return ONLY the neighborhood name, nothing else. Address: ${address}`}]})})
  const data = await res.json()
  return NextResponse.json({ neighborhood: data.content?.[0]?.text?.trim()||'' })
}
