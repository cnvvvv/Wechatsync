/**
 * MCP HTTP Client - 替代 WebSocket 客户端，连接 Vercel HTTP API
 */

import { createLogger } from '../lib/logger'

const logger = createLogger('MCPHttpClient')

interface RequestMessage {
  id: string
  method: string
  params?: Record<string, unknown>
}

interface ResponseMessage {
  id: string
  result?: unknown
  error?: {
    code: number
    message: string
  }
}

interface ExtensionRegistration {
  id: string
  callbackUrl: string
  token: string
}

class McpHttpClient {
  private baseUrl: string
  private extensionId: string
  private token: string | null = null
  private registration: ExtensionRegistration | null = null

  // 重连配置
  private reconnectAttempts = 0
  private readonly maxReconnectAttempts = 100
  private readonly minReconnectInterval = 1000
  private readonly maxReconnectInterval = 30000

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
    this.extensionId = `ext_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
  }

  /**
   * 设置安全 token
   */
  setToken(token: string): void {
    this.token = token
    logger.debug('Token set')
  }

  /**
   * 注册 Extension 到 Vercel
   */
  async register(): Promise<void> {
    // 获取回调 URL（从 local storage 或默认值）
    const callbackUrl = await this.getCallbackUrl()

    const registration = {
      id: this.extensionId,
      callbackUrl,
      token: this.token || '',
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/mcp`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Extension-Token': registration.token,
        },
        body: JSON.stringify(registration),
      })

      if (!response.ok) {
        throw new Error(`Registration failed: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      logger.info(`Extension registered: ${this.extensionId}`)

      // 保存注册信息
      this.registration = registration
      localStorage.setItem('wechatsync_mcp_registration', JSON.stringify(registration))
    } catch (error) {
      logger.error('Extension registration failed:', error)
      throw error
    }
  }

  /**
   * 获取回调 URL
   */
  private async getCallbackUrl(): Promise<string> {
    // 从 local storage 获取
    const stored = localStorage.getItem('wechatsync_mcp_callback_url')
    if (stored) {
      return stored
    }

    // 生成默认回调 URL
    const port = await this.findAvailablePort()
    const callbackUrl = `http://localhost:${port}/mcp`

    // 保存到 local storage
    localStorage.setItem('wechatsync_mcp_callback_url', callbackUrl)

    return callbackUrl
  }

  /**
   * 查找可用端口
   */
  private async findAvailablePort(): Promise<number> {
    const startPort = 10000
    const maxPort = 20000

    for (let port = startPort; port < maxPort; port++) {
      try {
        // 尝试连接该端口
        const response = await fetch(`http://localhost:${port}/health`, {
          method: 'GET',
          timeout: 1000,
        })

        // 如果端口被占用，会收到响应（即使错误）
        if (response.status >= 200) {
          continue
        }
      } catch {
        // 连接失败说明端口可用
        return port
      }
    }

    throw new Error('No available port found')
  }

  /**
   * 发送请求到 Vercel API
   */
  async request<T = unknown>(method: string, params?: Record<string, unknown>): Promise<T> {
    // 确保已注册
    if (!this.registration) {
      await this.register()
    }

    const id = this.generateId()
    const message: RequestMessage = {
      id,
      method,
      params,
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Extension-Id': this.extensionId,
          'X-Extension-Token': this.registration!.token,
        },
        body: JSON.stringify(message),
        timeout: 45000, // 45秒超时
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result: ResponseMessage = await response.json()

      if (result.error) {
        throw new Error(`MCP Error ${result.error.code}: ${result.error.message}`)
      }

      return result.result as T
    } catch (error) {
      logger.error(`Request failed: ${method}`, error)

      // 如果是认证错误，重新注册
      if (error instanceof Error && error.message.includes('401')) {
        logger.info('Re-registering extension...')
        this.registration = null
        await this.register()
        return this.request(method, params)
      }

      throw error
    }
  }

  /**
   * 检查连接状态
   */
  async checkStatus(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/health`, {
        method: 'GET',
        timeout: 5000,
      })
      return response.ok
    } catch {
      return false
    }
  }

  /**
   * 生成唯一 ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
  }
}

// 单例实例
export const mcpHttpClient = new McpHttpClient(
  // 从环境变量或配置获取 Vercel URL
  process.env.VERCEL_URL || 'https://wechatsync.vercel.app'
)

// 启动时自动注册
export async function startMcpHttpConnection(): Promise<void> {
  try {
    // 从 local storage 获取 token
    const token = localStorage.getItem('wechatsync_mcp_token')
    if (token) {
      mcpHttpClient.setToken(token)
    }

    await mcpHttpClient.register()
    logger.info('MCP HTTP connection established')
  } catch (error) {
    logger.error('Failed to establish MCP HTTP connection:', error)
    throw error
  }
}