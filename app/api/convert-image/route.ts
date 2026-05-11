import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

    const arrayBuffer = await file.arrayBuffer()
    const inputBuffer = Buffer.from(arrayBuffer)
    const jpeg = await sharp(inputBuffer).rotate().jpeg({ quality: 92 }).toBuffer()
    const uint8 = new Uint8Array(jpeg)

    return new NextResponse(uint8, {
      headers: { 'Content-Type': 'image/jpeg' }
    })
  } catch (e) {
    console.error('convert error:', e)
    return NextResponse.json({ error: 'Conversion failed' }, { status: 500 })
  }
}
