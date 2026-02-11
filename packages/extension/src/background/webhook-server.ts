/**
 * Webhook Server - 本地 HTTP 服务器，接收来自 Vercel 的请求
 */

import http from 'http'
import { createLogger } from '../lib/logger'

const logger = createLogger('WebhookServer')

interface WebhookRequest {
  method: string
  params?: Record<string, unknown>
  timestamp: number
}

interface WebhookResponse {
  success: boolean
  result?: unknown
  error?: string
}

export class WebhookServer {
  private server: http.Server | null = null
  private port: number = 0
  private token: string | null = null
  private isRunning = false

  constructor() {
    // 从 local storage 获取 token
    this.token = localStorage.getItem('wechatsync_mcp_token')
  }

  /**
   * 启动服务器
   */
  async start(): Promise<number> {
    return new Promise((resolve, reject) => {
      // 查找可用端口
      this.findAvailablePort().then(availablePort => {
        this.port = availablePort
        this.server = http.createServer(this.handleRequest.bind(this))

        this.server.listen(this.port, () => {
          logger.info(`Webhook server started on port ${this.port}`)
          this.isRunning = true
          resolve(this.port)
        })

        this.server.on('error', (error) => {
          logger.error('Webhook server error:', error)
          this.isRunning = false
          reject(error)
        })
      }).catch(reject)
    })
  }

  /**
   * 停止服务器
   */
  stop(): void {
    if (this.server) {
      this.server.close()
      this.server = null
      this.isRunning = false
      logger.info('Webhook server stopped')
    }
  }

  /**
   * 获取服务器状态
   */
  isServerRunning(): boolean {
    return this.isRunning
  }

  /**
   * 获取回调 URL
   */
  getCallbackUrl(): string {
    return `http://localhost:${this.port}/mcp`
  }

  /**
   * 查找可用端口
   */
  private async findAvailablePort(): Promise<number> {
    const startPort = 10000
    const maxPort = 20000

    for (let port = startPort; port < maxPort; port++) {
      try {
        // 尝试创建服务器
        const testServer = http.createServer()
        await new Promise((resolve, reject) => {
          testServer.listen(port, () => {
            testServer.close(() => resolve(port))
          })
          testServer.on('error', reject)
        })
        return port
      } catch {
        continue
      }
    }

    throw new Error('No available port found')
  }

  /**
   * 处理请求
   */
  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    // 设置 CORS 头
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    if (req.method === 'OPTIONS') {
      res.writeHead(200)
      res.end()
      return
    }

    if (req.method === 'GET') {
      if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ status: 'ok', port: this.port }))
        return
      }

      if (req.url === '/status') {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({
          status: 'ok',
          port: this.port,
          token: !!this.token,
        }))
        return
      }
    }

    if (req.method === 'POST') {
      if (req.url === '/mcp') {
        try {
          const body = await this.readRequestBody(req)
          const webhookReq: WebhookRequest = JSON.parse(body)

          // 验证 token
          const authHeader = req.headers['x-extension-token']
          if (!this.token || !authHeader || authHeader !== this.token) {
            res.writeHead(401, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'Invalid or missing token' }))
            return
          }

          // 验证时间戳（防止重放攻击）
          const timestamp = webhookReq.timestamp
          const now = Date.now()
          if (Math.abs(now - timestamp) > 60000) { // 1分钟容差
            res.writeHead(400, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'Invalid timestamp' }))
            return
          }

          // 处理请求
          const result = await this.handleMcpRequest(webhookReq.method, webhookReq.params)

          const response: WebhookResponse = {
            success: true,
            result,
          }

          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify(response))
        } catch (error) {
          logger.error('Webhook request error:', error)

          const response: WebhookResponse = {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          }

          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify(response))
        }
        return
      }
    }

    // 404
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Not found' }))
  }

  /**
   * 读取请求体
   */
  private readRequestBody(req: http.IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      let body = ''
      req.on('data', chunk => body += chunk)
      req.on('end', () => resolve(body))
      req.on('error', reject)
    })
  }

  /**
   * 处理 MCP 请求
   */
  private async handleMcpRequest(method: string, params?: Record<string, unknown>): Promise<unknown> {
    // 导入 MCP 处理逻辑
    const { mcpClient } = await import('./mcp/client')

    try {
      let result: unknown

      switch (method) {
        case 'listPlatforms': {
          const forceRefresh = (params?.forceRefresh as boolean) ?? false
          result = await mcpClient.handleMethod('listPlatforms', { forceRefresh })
          break
        }

        case 'checkAuth': {
          const platform = params?.platform as string
          if (!platform) throw new Error('Missing platform parameter')
          result = await mcpClient.handleMethod('checkAuth', { platform })
          break
        }

        case 'syncArticle': {
          const platforms = params?.platforms as string[]
          const articleData = params?.article as {
            title: string
            content?: string
            markdown?: string
            cover?: string
          }

          if (!platforms?.length) throw new Error('Missing platforms parameter')
          if (!articleData?.title) throw new Error('Missing article title')
          if (!articleData?.markdown && !articleData?.content) {
            throw new Error('Missing article content (markdown or content required)')
          }

          result = await mcpClient.handleMethod('syncArticle', {
            platforms,
            article: articleData,
          })
          break
        }

        case 'extractArticle': {
          result = await mcpClient.handleMethod('extractArticle')
          break
        }

        case 'uploadImage': {
          const imageData = params?.imageData as string
          const mimeType = params?.mimeType as string
          const platform = (params?.platform as string) || 'weibo'

          if (!imageData) throw new Error('Missing imageData parameter')
          if (!mimeType) throw new Error('Missing mimeType parameter')

          result = await mcpClient.handleMethod('uploadImage', {
            imageData,
            mimeType,
            platform,
          })
          break
        }

        case 'uploadImage:start': {
          const uploadId = params?.uploadId as string
          const totalChunks = params?.totalChunks as number
          const mimeType = params?.mimeType as string
          const platform = (params?.platform as string) || 'weibo'

          if (!uploadId) throw new Error('Missing uploadId')
          if (!totalChunks) throw new Error('Missing totalChunks')
          if (!mimeType) throw new Error('Missing mimeType')

          result = await mcpClient.handleMethod('uploadImage:start', {
            uploadId,
            totalChunks,
            mimeType,
            platform,
          })
          break
        }

        case 'uploadImage:chunk': {
          const uploadId = params?.uploadId as string
          const chunkIndex = params?.chunkIndex as number
          const data = params?.data as string

          if (!uploadId) throw new Error('Missing uploadId')
          if (chunkIndex === undefined) throw new Error('Missing chunkIndex')
          if (!data) throw new Error('Missing chunk data')

          result = await mcpClient.handleMethod('uploadImage:chunk', {
            uploadId,
            chunkIndex,
            data,
          })
          break
        }

        case 'uploadImage:complete': {
          const uploadId = params?.uploadId as string
          if (!uploadId) throw new Error('Missing uploadId')

          result = await mcpClient.handleMethod('uploadImage:complete', {
            uploadId,
          })
          break
        }

        default:
          throw new Error(`Unknown method: ${method}`)
      }

      return result
    } catch (error) {
      logger.error(`MCP request failed: ${method}`, error)
      throw error
    }
  }
}

// 单例实例
let webhookServer: WebhookServer | null = null

export function getWebhookServer(): WebhookServer {
  if (!webhookServer) {
    webhookServer = new WebhookServer()
  }
  return webhookServer
}

// 启动 webhook 服务器
export async function startWebhookServer(): Promise<number> {
  const server = getWebhookServer()
  return await server.start()
}

// 停止 webhook 服务器
export function stopWebhookServer(): void {
  if (webhookServer) {
    webhookServer.stop()
    webhookServer = null
  }
}