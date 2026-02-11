import { NextRequest, NextResponse } from '@vercel/node'
import { extensionProxy } from './lib/extension-proxy'

interface ArticleData {
  title: string
  content?: string
  markdown?: string
  cover?: string
  tags?: string[]
  category?: string
}

interface SyncResult {
  platform: string
  success: boolean
  postId?: string
  postUrl?: string
  error?: string
  timestamp: number
}

export default async function handler(req: NextRequest) {
  if (req.method !== 'POST') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
  }

  try {
    const { method, params, extensionId } = await req.json()

    // 验证 MCP 协议
    if (method !== 'syncArticle' && method !== 'extractArticle') {
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

    // 验证文章大小限制
    if (method === 'syncArticle') {
      const article = params?.article as ArticleData
      const maxSize = parseInt(process.env.MAX_ARTICLE_SIZE || '1048576', 10) // 1MB

      // 检查内容大小
      const contentSize = (article?.markdown || article?.content || '').length
      if (contentSize > maxSize) {
        return NextResponse.json(
          { error: `Article content too large (max: ${maxSize} characters)` },
          { status: 413 }
        )
      }
    }

    // 转发请求
    const result = await extensionProxy.forwardRequest(extensionId, method, params)

    return NextResponse.json(result)
  } catch (error) {
    console.error('[Articles] Error:', error)
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    )
  }
}