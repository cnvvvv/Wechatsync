/**
 * Extension Proxy - 管理 Chrome Extension 注册和请求转发
 *
 * 此模块负责：
 * 1. 存储 Extension 注册信息（内存存储，TTL 管理）
 * 2. 验证 Extension Token
 * 3. 转发请求到 Extension 的回调端点
 */

import crypto from 'crypto'

// Extension 注册信息
interface ExtensionRegistration {
  id: string
  callbackUrl: string
  token: string
  registeredAt: number
  lastActive: number
}

export class ExtensionProxy {
  private extensions = new Map<string, ExtensionRegistration>()
  private readonly TTL = parseInt(process.env.EXTENSION_TTL || '300', 10) * 1000 // 5分钟

  /**
   * 注册 Extension
   */
  async registerExtension(id: string, callbackUrl: string, token: string): Promise<void> {
    // 验证 Token 格式
    if (!token || token.length < 32) {
      throw new Error('Invalid token: must be at least 32 characters')
    }

    // 清理过期的 Extension
    this.cleanupExpiredExtensions()

    const registration: ExtensionRegistration = {
      id,
      callbackUrl,
      token,
      registeredAt: Date.now(),
      lastActive: Date.now(),
    }

    this.extensions.set(id, registration)
    console.log(`[Proxy] Extension registered: ${id} -> ${callbackUrl}`)
  }

  /**
   * 验证 Extension Token
   */
  async verifyExtensionToken(id: string, token: string): Promise<boolean> {
    const registration = this.extensions.get(id)
    if (!registration) {
      return false
    }

    // 更新最后活跃时间
    registration.lastActive = Date.now()
    this.extensions.set(id, registration)

    return registration.token === token
  }

  /**
   * 获取 Extension 回调 URL
   */
  async getExtensionUrl(id: string): Promise<string | null> {
    const registration = this.extensions.get(id)
    if (!registration) {
      return null
    }

    // 更新最后活跃时间
    registration.lastActive = Date.now()
    this.extensions.set(id, registration)

    return registration.callbackUrl
  }

  /**
   * 检查 Extension 是否在线
   */
  async isExtensionOnline(id: string): Promise<boolean> {
    const registration = this.extensions.get(id)
    if (!registration) {
      return false
    }

    // 检查是否过期
    if (Date.now() - registration.lastActive > this.TTL) {
      this.extensions.delete(id)
      return false
    }

    // 发送健康检查请求
    try {
      const response = await fetch(`${registration.callbackUrl}/health`, {
        method: 'GET',
        timeout: 5000,
      })
      return response.ok
    } catch {
      return false
    }
  }

  /**
   * 转发请求到 Extension
   */
  async forwardRequest(
    extensionId: string,
    method: string,
    params?: Record<string, unknown>
  ): Promise<unknown> {
    const registration = this.extensions.get(extensionId)
    if (!registration) {
      throw new Error(`Extension not registered: ${extensionId}`)
    }

    // 检查过期
    if (Date.now() - registration.lastActive > this.TTL) {
      this.extensions.delete(extensionId)
      throw new Error(`Extension expired: ${extensionId}`)
    }

    const url = `${registration.callbackUrl}/mcp`
    const body = JSON.stringify({
      method,
      params,
      timestamp: Date.now(),
    })

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Extension-Id': extensionId,
          'X-Extension-Token': registration.token,
        },
        body,
        timeout: 45000, // 45秒超时
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      return result
    } catch (error) {
      console.error(`[Proxy] Failed to forward request to ${extensionId}:`, error)
      throw error
    }
  }

  /**
   * 清理过期的 Extension
   */
  private cleanupExpiredExtensions(): void {
    const now = Date.now()
    for (const [id, registration] of this.extensions.entries()) {
      if (now - registration.lastActive > this.TTL) {
        this.extensions.delete(id)
        console.log(`[Proxy] Expired extension removed: ${id}`)
      }
    }
  }

  /**
   * 获取注册的 Extension 列表
   */
  listExtensions(): Array<{ id: string; lastActive: number }> {
    const now = Date.now()
    const extensions: Array<{ id: string; lastActive: number }> = []

    for (const [id, registration] of this.extensions.entries()) {
      // 只返回活跃的 Extension
      if (now - registration.lastActive <= this.TTL) {
        extensions.push({
          id,
          lastActive: registration.lastActive,
        })
      }
    }

    return extensions
  }
}

// 全局实例
export const extensionProxy = new ExtensionProxy()