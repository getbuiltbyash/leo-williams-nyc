import { NextRequest, NextResponse } from 'next/server'
export async function POST(req: NextRequest) {
  const { neighborhood, beds, baths, price, lease, concessions, op_paid, amenities, notes } = await req.json()
  const prompt = `Write a short, warm, compelling NYC rental listing description. Under 85 words. Sound like a knowledgeable local who genuinely cares.\n\nNeighborhood: ${neighborhood}\nBedrooms: ${beds||'Studio'}\nBathrooms: ${baths||'not specified'}\nRent: ${price||'not specified'}\nLease: ${lease||'not specified'}\nNo broker fee: ${op_paid?'Yes':'No'}\nAmenities: ${amenities||'none'}\nConcessions: ${concessions||'none'}\nNotes: ${notes||'none'}\n\nWrite ONLY the description. No headline. No bullets. 3-4 sentences.`
  const res = await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':process.env.ANTHROPIC_API_KEY!,'anthropic-version':'2023-06-01'},body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:200,messages:[{role:'user',content:prompt}]})})
  const data = await res.json()
  return NextResponse.json({ description: data.content?.[0]?.text?.trim()||'' })
}
