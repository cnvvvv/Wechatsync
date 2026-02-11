import { NextRequest, NextResponse } from '@vercel/node'
import { extensionProxy } from './lib/extension-proxy'

export const config = {
  api: {
    bodyParser: true,
    maxBodySize: '10mb',
  },
}

export default async function handler(req: NextRequest) {
  const { method } = req

  if (method === 'POST') {
    // MCP 协议统一入口
    try {
      const body = await req.json()
      const { method: rpcMethod, params, extensionId } = body

      // 验证 MCP 协议方法
      const supportedMethods = [
        'listPlatforms',
        'checkAuth',
        'syncArticle',
        'extractArticle',
        'uploadImage',
        'uploadImage:start',
        'uploadImage:chunk',
        'uploadImage:complete',
      ]

      if (!supportedMethods.includes(rpcMethod)) {
        return NextResponse.json(
          {
            error: `Unsupported MCP method: ${rpcMethod}`,
            supported: supportedMethods
          },
          { status: 400 }
        )
      }

      // 验证 Extension ID
      if (!extensionId) {
        return NextResponse.json(
          { error: 'Missing extensionId' },
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

      // 根据方法路由到对应的处理函数
      let result
      switch (rpcMethod) {
        case 'listPlatforms':
        case 'checkAuth':
          result = await extensionProxy.forwardRequest(extensionId, rpcMethod, params)
          break
        case 'syncArticle':
        case 'extractArticle':
          result = await extensionProxy.forwardRequest(extensionId, rpcMethod, params)
          break
        case 'uploadImage':
        case 'uploadImage:start':
        case 'uploadImage:chunk':
        case 'uploadImage:complete':
          result = await extensionProxy.forwardRequest(extensionId, rpcMethod, params)
          break
        default:
          return NextResponse.json(
            { error: 'Method not implemented' },
            { status: 501 }
          )
      }

      return NextResponse.json(result)
    } catch (error) {
      console.error('[MCP] Error:', error)
      return NextResponse.json(
        { error: (error as Error).message },
        { status: 500 }
      )
    }
  } else if (method === 'PUT') {
    // Extension 注册端点
    try {
      const { id, callbackUrl, token } = await req.json()

      if (!id || !callbackUrl || !token) {
        return NextResponse.json(
          { error: 'Missing required fields: id, callbackUrl, token' },
          { status: 400 }
        )
      }

      await extensionProxy.registerExtension(id, callbackUrl, token)

      return NextResponse.json({
        success: true,
        message: 'Extension registered successfully',
        id,
      })
    } catch (error) {
      console.error('[MCP] Registration error:', error)
      return NextResponse.json(
        { error: (error as Error).message },
        { status: 400 }
      )
    }
  } else if (method === 'GET') {
    // 状态查询端点
    const extensions = extensionProxy.listExtensions()
    return NextResponse.json({
      status: 'ok',
      extensions: extensions.length,
      extensionsList: extensions,
    })
  } else {
    return NextResponse.json(
      { error: 'Method not allowed' },
      { status: 405 }
    )
  }
}