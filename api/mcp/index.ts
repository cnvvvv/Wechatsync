import { VercelRequest, VercelResponse } from '@vercel/node'

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    res.status(200).json({
      status: 'ok',
      message: 'MCP Server endpoint',
      endpoints: ['GET /api/mcp', 'PUT /api/mcp'],
    })
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
}