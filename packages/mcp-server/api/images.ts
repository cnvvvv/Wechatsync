import { NextRequest, NextResponse } from '@vercel/node'
import { extensionProxy } from './lib/extension-proxy'

export default async function handler(req: NextRequest) {
  if (req.method !== 'POST') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
  }

  try {
    const { method, params, extensionId } = await req.json()

    // 验证 MCP 协议
    if (method !== 'uploadImage' &&
        method !== 'uploadImage:start' &&
        method !== 'uploadImage:chunk' &&
        method !== 'uploadImage:complete') {
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

    // 验证图片大小限制
    if (method === 'uploadImage') {
      const imageData = params?.imageData as string
      const maxSize = parseInt(process.env.MAX_IMAGE_SIZE || '5242880', 10) // 5MB

      if (imageData && imageData.length > maxSize) {
        return NextResponse.json(
          { error: `Image too large (max: ${maxSize} bytes)` },
          { status: 413 }
        )
      }
    }

    // 验证分片数量限制
    if (method === 'uploadImage:start') {
      const totalChunks = params?.totalChunks as number
      const maxChunks = parseInt(process.env.MAX_CHUNKS || '10', 10)

      if (totalChunks && totalChunks > maxChunks) {
        return NextResponse.json(
          { error: `Too many chunks (max: ${maxChunks})` },
          { status: 400 }
        )
      }
    }

    // 转发请求
    const result = await extensionProxy.forwardRequest(extensionId, method, params)

    return NextResponse.json(result)
  } catch (error) {
    console.error('[Images] Error:', error)
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    )
  }
}