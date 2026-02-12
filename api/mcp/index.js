module.exports = async (req, res) => {
  if (req.method === 'GET') {
    res.status(200).json({
      status: 'ok',
      message: 'MCP Server endpoint',
      endpoints: ['GET /api/mcp'],
    })
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
}