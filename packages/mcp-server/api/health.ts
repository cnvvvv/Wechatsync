import { NextRequest, NextResponse } from '@vercel/node'

export default async function handler(req: NextRequest) {
  if (req.method !== 'GET') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
  }

  try {
    return NextResponse.json({
      status: 'ok',
      timestamp: Date.now(),
      service: 'wechatsync-mcp',
      uptime: process.uptime(),
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Health check failed' },
      { status: 500 }
    )
  }
}