import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import express, { type Request, type Response } from 'express'

const HTTP_PORT = parseInt(process.env.PORT || '9528', 10)

/**
 * 创建 MCP Server
 */
function createServer(): Server {
  const server = new Server(
    {
      name: 'sync-assistant',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  )

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'list_platforms',
          description: '列出所有支持的平台',
          inputSchema: {
            type: 'object',
            properties: {
              forceRefresh: {
                type: 'boolean',
                description: '是否强制刷新',
              },
            },
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
          description: '同步文章到指定平台',
          inputSchema: {
            type: 'object',
            properties: {
              platforms: {
                type: 'array',
                items: { type: 'string' },
                description: '目标平台 ID 列表',
              },
              title: {
                type: 'string',
                description: '文章标题',
              },
              markdown: {
                type: 'string',
                description: '文章正文内容（Markdown 格式）',
              },
              content: {
                type: 'string',
                description: '文章正文内容（HTML 格式，可选）',
              },
              cover: {
                type: 'string',
                description: '封面图 URL 或 base64 data URI（可选）',
              },
            },
            required: ['platforms', 'title', 'markdown'],
          },
        },
      ],
    }
  })

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params

    try {
      let result: unknown

      switch (name) {
        case 'list_platforms':
          result = {
            platforms: [
              { id: 'zhihu', name: '知乎', auth: 'mock' },
              { id: 'juejin', name: '掘金', auth: 'mock' },
              { id: 'toutiao', name: '今日头条', auth: 'mock' },
              { id: 'csdn', name: 'CSDN', auth: 'mock' },
              { id: 'jianshu', name: '简书', auth: 'mock' },
            ],
          }
          break

        case 'check_auth':
          result = {
            platform: (args as { platform: string }).platform,
            auth: 'mock',
            message: '模拟登录状态',
          }
          break

        case 'sync_article':
          result = [
            {
              platform: (args as { platforms: string[] }).platforms[0],
              status: 'success',
              message: '文章同步成功（模拟）',
              articleId: 'mock-123',
            },
          ]
          break

        default:
          throw new Error(`Unknown tool: ${name}`)
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: error instanceof Error ? error.message : 'Unknown error',
            }),
          },
        ],
        isError: true,
      }
    }
  })

  return server
}

// Express app for SSE
const app = express()

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'WechatSync MCP Server is running',
    timestamp: new Date().toISOString(),
  })
})

// MCP endpoint
app.get('/mcp', (req, res) => {
  res.json({
    status: 'ok',
    message: 'MCP Server endpoint',
    endpoints: ['GET /api/mcp'],
  })
})

// Start server
if (process.argv.includes('--sse')) {
  app.listen(HTTP_PORT, () => {
    console.log(`SSE MCP Server listening on port ${HTTP_PORT}`)
  })
} else {
  // Default to stdio mode
  const server = createServer()
  const transport = new StdioServerTransport()
  transport.handleRequest(server)
}