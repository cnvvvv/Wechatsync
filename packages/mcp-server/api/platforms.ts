import { NextRequest, NextResponse } from '@vercel/node'
import { extensionProxy } from './lib/extension-proxy'

interface PlatformInfo {
  id: string
  name: string
  icon: string
  homepage: string
  isAuthenticated: boolean
  username?: string
  avatar?: string
  error?: string
}

export default async function handler(req: NextRequest) {
  if (req.method !== 'POST') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
  }

  try {
    const { method, params, extensionId } = await req.json()

    // 验证 MCP 协议
    if (method !== 'listPlatforms' && method !== 'checkAuth') {
      return NextResponse.json(
        { error: 'Unsupported method' },
        { status: 400 }
      )
    }

    // 验证 Extension Token
    const extensionToken = req.headers.get('X-Extension-Token')
    if (!extensionToken || !await extensionProxy.verifyExtensionToken(extensionId, extensionToken)) {
      return NextResponse.json(
        { error: 'Invalid or missing extension token' },
        { status: 401 }
      )
    }

    // 转发请求
    const result = await extensionProxy.forwardRequest(extensionId, method, params)

    return NextResponse.json(result)
  } catch (error) {
    console.error('[Platforms] Error:', error)
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    )
  }
}