/**
 * MCP 协议层 - 解析 MCP 请求和响应
 *
 * 此模块负责：
 * 1. 解析 MCP 请求格式
 * 2. 路由到对应的处理函数
 * 3. 返回 MCP 响应格式
 * 4. 保持与 Claude Desktop 的兼容性
 */

import type {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js'

export interface McpRequest {
  jsonrpc: '2.0'
  id: string
  method: string
  params?: {
    [key: string]: any
  }
}

export interface McpResponse {
  jsonrpc: '2.0'
  id?: string
  result?: any
  error?: {
    code: number
    message: string
    data?: any
  }
}

export interface McpNotification {
  jsonrpc: '2.0'
  method: string
  params?: {
    [key: string]: any
  }
}

export class McpProtocolHandler {
  private tools: Tool[] = []

  constructor() {
    this.initializeTools()
  }

  /**
   * 初始化 MCP 工具定义
   */
  private initializeTools(): void {
    this.tools = [
      {
        name: 'list_platforms',
        description: '列出所有支持的平台及其登录状态',
        inputSchema: {
          type: 'object',
          properties: {
            forceRefresh: {
              type: 'boolean',
              description: '是否强制刷新登录状态（默认使用缓存）',
            },
          },
          required: [],
        },
      },
      {
        name: 'check_auth',
        description: '检查指定平台的登录状态',
        inputSchema: {
          type: 'object',
          properties: {
            platform: {
              type: 'string',
              description: '平台 ID，如 zhihu, juejin, toutiao 等',
            },
          },
          required: ['platform'],
        },
      },
      {
        name: 'sync_article',
        description: '同步文章到指定平台（保存为草稿）。支持 Markdown 或 HTML 格式，优先使用 markdown 字段。重要：如果文章包含本地图片引用，必须先读取图片文件并转换为 base64 data URI 格式（如 ![img](data:image/png;base64,xxx)）。',
        inputSchema: {
          type: 'object',
          properties: {
            platforms: {
              type: 'array',
              items: { type: 'string' },
              description: '目标平台 ID 列表，如 ["zhihu", "juejin"]',
            },
            title: {
              type: 'string',
              description: '文章标题（纯文本，不含 # 号）',
            },
            markdown: {
              type: 'string',
              description: '文章正文内容（Markdown 格式，推荐）。注意：1) 不要包含标题行（# xxx），只传正文部分；2) 本地图片必须转换为 base64 data URI 格式，如 ![图片](data:image/png;base64,iVBORw0KGgo...)',
            },
            content: {
              type: 'string',
              description: '文章正文内容（HTML 格式，可选）。如果提供了 markdown 则此字段可忽略。',
            },
            cover: {
              type: 'string',
              description: '封面图 URL 或 base64 data URI（可选）',
            },
          },
          required: ['platforms', 'title', 'markdown'],
        },
      },
      {
        name: 'extract_article',
        description: '从当前浏览器页面提取文章内容',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'upload_image_file',
        description: '从本地文件路径上传图片到图床平台，返回可公开访问的 URL。推荐使用此方法，无需手动转换 base64。',
        inputSchema: {
          type: 'object',
          properties: {
            filePath: {
              type: 'string',
              description: '本地图片文件的绝对路径，如 /Users/xxx/image.png',
            },
            platform: {
              type: 'string',
              description: '上传到哪个平台作为图床，默认 weibo。可选: weibo, zhihu, juejin, jianshu, woshipm',
            },
          },
          required: ['filePath'],
        },
      },
    ]
  }

  /**
   * 解析 MCP 请求
   */
  parseRequest(json: string): McpRequest {
    try {
      const parsed = JSON.parse(json)

      if (typeof parsed !== 'object' || parsed === null) {
        throw new Error('Invalid JSON: not an object')
      }

      if (parsed.jsonrpc !== '2.0') {
        throw new Error('Invalid JSON-RPC version')
      }

      if (!parsed.id && !parsed.method) {
        throw new Error('Missing request id and method')
      }

      return parsed as McpRequest
    } catch (error) {
      throw new Error(`Failed to parse MCP request: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * 创建 MCP 响应
   */
  createResponse(request: McpRequest, result?: any): McpResponse {
    return {
      jsonrpc: '2.0',
      id: request.id,
      result,
    }
  }

  /**
   * 创建 MCP 错误响应
   */
  createErrorResponse(request: McpRequest, code: number, message: string): McpResponse {
    return {
      jsonrpc: '2.0',
      id: request.id,
      error: {
        code,
        message,
      },
    }
  }

  /**
   * 处理 MCP 请求
   */
  async handleRequest(request: McpRequest): Promise<McpResponse> {
    try {
      // 检查是否是工具列表请求
      if (request.method === 'tools/list') {
        return this.createResponse(request, {
          tools: this.tools,
        })
      }

      // 检查是否是工具调用请求
      if (request.method === 'tools/call') {
        const { name, arguments: args } = request.params || {}

        if (!name) {
          return this.createErrorResponse(request, -32602, 'Invalid params: missing name')
        }

        // 查找工具定义
        const tool = this.tools.find(t => t.name === name)
        if (!tool) {
          return this.createErrorResponse(request, -32601, `Unknown tool: ${name}`)
        }

        // 调用工具
        const result = await this.callTool(name, args)
        return this.createResponse(request, result)
      }

      // 未知方法
      return this.createErrorResponse(request, -32601, `Unknown method: ${request.method}`)
    } catch (error) {
      return this.createErrorResponse(request, -32603, `Internal error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * 调用工具
   */
  private async callTool(name: string, args?: any): Promise<any> {
    // 这里需要调用实际的业务逻辑
    // 由于这是 Vercel 部署版本，工具调用会通过 HTTP 转发到 Extension
    // 返回一个占位符，实际的调用会在 API 层处理
    return {
      status: 'forwarded',
      tool: name,
      args,
      message: 'This tool call will be forwarded to the Chrome Extension',
    }
  }

  /**
   * 获取工具列表
   */
  getTools(): Tool[] {
    return this.tools
  }

  /**
   * 验证 MCP 请求
   */
  validateRequest(request: any): boolean {
    if (typeof request !== 'object' || request === null) {
      return false
    }

    if (request.jsonrpc !== '2.0') {
      return false
    }

    if (!request.id && !request.method) {
      return false
    }

    return true
  }
}

// 全局实例
export const mcpProtocolHandler = new McpProtocolHandler()