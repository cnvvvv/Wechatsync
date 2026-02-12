import { VercelRequest, VercelResponse } from '@vercel/node'

const platforms = [
  { id: 'zhihu', name: '知乎', auth: 'mock' },
  { id: 'juejin', name: '掘金', auth: 'mock' },
  { id: 'toutiao', name: '今日头条', auth: 'mock' },
  { id: 'csdn', name: 'CSDN', auth: 'mock' },
  { id: 'jianshu', name: '简书', auth: 'mock' },
]

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    res.status(200).json({
      success: true,
      data: platforms,
    })
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
}