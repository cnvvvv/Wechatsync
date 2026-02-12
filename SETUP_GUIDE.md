# Wechatsync Vercel 部署和模型配置指南

## 📋 清单检查

### 部署前准备
- [ ] GitHub 仓库已推送
- [ ] Vercel 账号已注册
- [ ] 环境变量已准备
- [ ] API Key 已获取

### 环境变量列表
```bash
MCP_TOKEN_SECRET=32位随机密钥
EXTENSION_TTL=300
MAX_IMAGE_SIZE=5242880
MAX_ARTICLE_SIZE=1048576
MAX_CHUNKS=10
```

## 🚀 部署步骤

### 1. 部署到 Vercel

#### 方法一：Web 控制台（推荐）
1. 打开 [vercel.com](https://vercel.com)
2. 点击 "New Project"
3. 选择 `cnvvvv/Wechatsync` 仓库
4. 选择 `v2` 分支
5. 添加环境变量（见上方列表）
6. 点击 "Deploy"

#### 方法二：CLI 部署
```bash
# 安装 CLI
npm install -g vercel

# 登录
vercel login

# 部署
vercel --prod
```

### 2. 获取部署信息

部署完成后，记录：
- URL: `https://xxx.vercel.app`
- 是否使用自定义域名

### 3. 更新配置文件

#### 更新扩展配置
编辑 `packages/extension/package.json`:
```json
{
  "config": {
    "vercelUrl": "https://xxx.vercel.app"
  }
}
```

#### 更新 Claude Desktop 配置
Claude Desktop 配置文件路径：
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- Mac: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Linux: `~/.config/claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "sync-assistant": {
      "transport": {
        "type": "http",
        "url": "https://xxx.vercel.app/api/mcp"
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

## 🧪 功能测试

### 1. API 测试

创建测试脚本 `test-api.js`:
```javascript
const DEPLOYMENT_URL = 'https://xxx.vercel.app';

async function testAPI() {
  // 测试健康检查
  const health = await fetch(`${DEPLOYMENT_URL}/api/health`);
  console.log('健康检查:', await health.json());

  // 测试注册
  const register = await fetch(`${DEPLOYMENT_URL}/api/mcp`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: 'test',
      callbackUrl: 'http://localhost:10000/mcp',
      token: 'test'
    })
  });
  console.log('注册测试:', await register.json());
}

testAPI();
```

### 2. 扩展测试

1. 安装 Chrome 扩展
2. 打开扩展设置
3. 启用 MCP 连接
4. 检查连接状态

### 3. Claude Desktop 测试

1. 重启 Claude Desktop
2. 确认看到新的模型 "openrouter-pony"
3. 测试 MCP 工具调用

## 🔍 故障排除

### 常见错误及解决方案

| 错误 | 原因 | 解决方案 |
|-----|-----|---------|
| 404 Not Found | URL 错误 | 检查 URL 是否正确 |
| 401 Unauthorized | Token 错误 | 检查 MCP_TOKEN_SECRET |
| 504 Gateway Timeout | 函数超时 | 减少 maxDuration |
| Connection Failed | 网络问题 | 检查防火墙设置 |

### 调试步骤

1. **检查 Vercel 日志**
   ```bash
   # 查看 Vercel 构建日志
   vercel logs
   ```

2. **本地测试**
   ```bash
   # 使用本地 Vercel CLI
   vercel dev
   ```

3. **网络测试**
   ```bash
   # 测试连接
   curl -v https://xxx.vercel.app/api/health
   ```

## 📊 监控和维护

### Vercel 监控

1. **访问监控面板**
   - 项目控制台 → Analytics
   - 查看请求和错误

2. **设置报警**
   - 错误率超过 1%
   - 响应时间超过 5s

### 定期维护

1. **更新依赖**
   ```bash
   pnpm update
   ```

2. **检查安全**
   - 更新 API Key
   - 审查环境变量

3. **性能优化**
   - 启用边缘缓存
   - 压缩静态资源

## 🎉 完成确认

部署完成后，检查以下项目：

- [ ] Vercel 部署成功
- [ ] 健康检查通过
- [ ] Extension 注册成功
- [ ] MCP 工具可用
- [ ] OpenRouter 模型可用
- [ ] 同步功能正常

## 📞 支持

如果遇到问题：

1. 查看 [Vercel 文档](https://vercel.com/docs)
2. 检查 [GitHub Issues](https://github.com/cnvvvv/Wechatsync/issues)
3. 查看 [部署日志](https://vercel.com/dashboard)

---

**祝您部署顺利！** 🚀