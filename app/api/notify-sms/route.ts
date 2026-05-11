import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { to, message } = await req.json()
    if (!to) return NextResponse.json({ error: 'No phone number' }, { status: 400 })

    // Use Twilio if configured, otherwise log
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const fromNumber = process.env.TWILIO_PHONE_NUMBER

    if (!accountSid || !authToken || !fromNumber) {
      console.log('SMS would send to:', to, '— Message:', message)
      return NextResponse.json({ success: true, note: 'Twilio not configured' })
    }

    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({ To: to, From: fromNumber, Body: message })
    })

    const data = await res.json()
    if (!res.ok) return NextResponse.json({ error: data.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('SMS error:', e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
