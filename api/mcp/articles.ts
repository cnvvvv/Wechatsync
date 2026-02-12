import { VercelRequest, VercelResponse } from '@vercel/node'

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    res.status(200).json({
      success: true,
      message: 'Article sync endpoint',
      data: {
        platforms: ['zhihu', 'juejin', 'toutiao'],
        status: 'mock',
      },
    })
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
}