import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

    const arrayBuffer = await file.arrayBuffer()
    const inputBuffer = new Uint8Array(arrayBuffer)

    const heicConvert = require('heic-convert')
    const jpegBuffer = await heicConvert({
      buffer: inputBuffer,
      format: 'JPEG',
      quality: 0.92
    })

    return new NextResponse(jpegBuffer, {
      headers: { 'Content-Type': 'image/jpeg' }
    })
  } catch (e) {
    console.error('convert error:', e)
    return NextResponse.json({ error: 'Conversion failed' }, { status: 500 })
  }
}
