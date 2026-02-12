# Vercel 部署测试指南

## 📝 快速开始

### 1. 部署到 Vercel

```bash
# 方法1: 通过控制台
1. 访问 vercel.com
2. 导入项目 cnvvvv/Wechatsync (v2分支)
3. 添加环境变量:
   - MCP_TOKEN_SECRET=your-secret-key-here
   - EXTENSION_TTL=300
   - MAX_IMAGE_SIZE=5242880
   - MAX_ARTICLE_SIZE=1048576
   - MAX_CHUNKS=10
4. 点击 Deploy

# 方法2: 使用 CLI
npm install -g vercel
vercel --prod
```

### 2. 设置环境变量

在 Vercel 项目设置中添加：

```bash
MCP_TOKEN_SECRET=your-secret-key-here-32chars-minimum
EXTENSION_TTL=300
MAX_IMAGE_SIZE=5242880
MAX_ARTICLE_SIZE=1048576
MAX_CHUNKS=10
```

### 3. 配置 Claude Desktop

更新 Claude Desktop 配置文件：

```json
{
  "mcpServers": {
    "sync-assistant": {
      "transport": {
        "type": "http",
        "url": "https://your-project.vercel.app/api/mcp"
      }
    }
  },
  "models": {
    "openrouter-pony": {
      "provider": "openrouter",
      "model": "openrouter/pony-alpha",
      "apiKey": "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",
      "apiBase": "https://openrouter.ai/api/v1",
      "maxTokens": 4000,
      "temperature": 0.7
    }
  }
}
```

## 🧪 测试部署

### 运行测试脚本

```bash
# 设置部署 URL
export DEPLOYMENT_URL="https://your-project.vercel.app"

# 运行测试
node test-deployment.js
```

### 手动测试

1. **健康检查**
   ```bash
   curl https://your-project.vercel.app/api/health
   ```

2. **Extension 注册**
   ```bash
   curl -X PUT https://your-project.vercel.app/api/mcp \
     -H "Content-Type: application/json" \
     -d '{"id":"test","callbackUrl":"http://localhost:10000/mcp","token":"test-token"}'
   ```

3. **列出平台**
   ```bash
   curl -X POST https://your-project.vercel.app/api/mcp \
     -H "Content-Type: application/json" \
     -H "X-Extension-Id: test" \
     -H "X-Extension-Token: test-token" \
     -d '{"method":"listPlatforms"}'
   ```

## 🔍 故障排除

### 常见问题

1. **部署失败**
   - 检查 package.json 依赖
   - 确认 Node.js 版本
   - 查看构建日志

2. **404 错误**
   - 确认 URL 正确
   - 检查路由配置

3. **401 错误**
   - 检查 MCP_TOKEN_SECRET
   - 确认 Token 格式

4. **超时错误**
   - 检查操作规模
   - 验证网络连接

### 调试步骤

1. 查看 Vercel 日志
2. 使用 curl 测试端点
3. 检查网络请求
4. 验证配置文件

## 📊 性能监控

### Vercel 监控

1. 访问项目控制台
2. 查看 "Analytics" 选项卡
3. 监控函数执行时间
4. 检查错误率

### 关键指标

- 函数执行时间 < 5s
- 错误率 < 1%
- 响应时间 < 200ms
- 成功率 > 99%

## 🎯 下一步

1. **测试扩展功能**
   - 安装 Chrome 扩展
   - 配置平台账号
   - 测试同步功能

2. **优化性能**
   - 启用缓存
   - 压缩响应
   - 使用 CDN

3. **安全加固**
   - 设置 IP 白名单
   - 实现限流
   - 定期更新密钥