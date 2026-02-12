module.exports = async (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'WechatSync MCP Server is running',
    timestamp: new Date().toISOString(),
  })
}