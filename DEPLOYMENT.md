# Wechatsync Vercel 部署指南

## 概述

本文档介绍如何将 Wechatsync 部署到 Vercel，实现纯 Serverless 架构。

## 架构变更

### 原架构
```
Claude Desktop <--MCP stdio/SSE--> MCP Server <--WebSocket--> Chrome Extension
```

### 新架构
```
Claude Desktop <--HTTP MCP--> Vercel API <--HTTP--> Chrome Extension
```

## 部署步骤

### 1. 准备工作

1. 创建 GitHub 仓库（如果还没有）
2. 确保代码已推送到 GitHub
3. 注册 Vercel 账号（https://vercel.com）

### 2. 创建 Vercel 项目

1. 登录 Vercel 控制台
2. 点击 "New Project"
3. 选择 GitHub 仓库
4. 点击 "Import"

### 3. 配置环境变量

在 Vercel 项目的 "Settings" > "Environment Variables" 中添加：

```bash
MCP_TOKEN_SECRET=your-secret-key-here
EXTENSION_TTL=300
MAX_IMAGE_SIZE=5242880
MAX_ARTICLE_SIZE=1048576
MAX_CHUNKS=10
```

**注意：** `MCP_TOKEN_SECRET` 必须是一个强密码（至少 32 位字符）

### 4. 构建和部署

1. 点击 "Deploy" 按钮
2. 等待构建完成
3. 获取部署 URL（格式：https://your-project-name.vercel.app）

### 5. 配置 Claude Desktop

在 Claude Desktop 的配置文件中添加：

```json
{
  "mcpServers": {
    "sync-assistant": {
      "transport": {
        "type": "http",
        "url": "https://your-project-name.vercel.app/api/mcp"
      }
    }
  }
}
```

### 6. 更新扩展配置

更新 `packages/extension/package.json` 中的 `config.vercelUrl`：

```json
{
  "config": {
    "vercelUrl": "https://your-project-name.vercel.app"
  }
}
```

## 操作规模限制

| 操作 | 限制 | 原因 |
|-----|-----|-----|
| 图片上传 | 单文件 ≤ 5MB | Vercel 函数超时限制 |
| 文章同步 | 文章内容 ≤ 1MB | 防止超时 |
| 分片上传 | 最多 10 个分片 | 简化实现 |
| 请求超时 | 50 秒 | 留 10 秒余量 |

## 扩展注册流程

1. Extension 启动时生成随机端口，启动本地 HTTP 服务器
2. Extension 向 Vercel API 注册，发送：
   - Extension ID
   - 回调 URL (http://localhost:随机端口)
   - Token
3. Vercel API 存储注册信息（内存，TTL 5分钟）
4. Claude Desktop 调用 Vercel API
5. Vercel API 转发请求到 Extension 的回调 URL

## 本地开发

### 启动 Vercel 本地开发

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录 Vercel
vercel login

# 启动本地开发
vercel dev
```

### 测试 API 端点

```bash
# 健康检查
curl https://your-project-name.vercel.app/api/health

# Extension 注册
curl -X PUT https://your-project-name.vercel.app/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"id":"test","callbackUrl":"http://localhost:10000/mcp","token":"test-token"}'

# 工具调用
curl -X POST https://your-project-name.vercel.app/api/mcp \
  -H "Content-Type: application/json" \
  -H "X-Extension-Id: test" \
  -H "X-Extension-Token: test-token" \
  -d '{"method":"listPlatforms"}'
```

## 故障排除

### 1. Extension 无法连接

**问题：** Extension 无法连接到 Vercel API

**解决方案：**
- 检查网络连接
- 验证 Vercel URL 是否正确
- 确认环境变量已配置

### 2. 请求超时

**问题：** 操作时出现超时错误

**解决方案：**
- 检查操作规模是否超出限制
- 减少 article 内容大小
- 优化图片大小

### 3. Token 认证失败

**问题：** 返回 401 错误

**解决方案：**
- 检查 MCP_TOKEN_SECRET 是否设置
- 确认 Extension Token 是否正确

### 4. Function 执行失败

**问题：** Vercel 函数执行失败

**解决方案：**
- 查看 Vercel 日志
- 检查函数超时设置
- 优化代码性能

## 监控和日志

### Vercel 日志

1. 进入 Vercel 项目控制台
2. 点击 "Logs" 选项卡
3. 查看实时日志

### 性能优化

1. **减少函数执行时间**
   - 优化数据库查询
   - 使用缓存
   - 减少不必要的计算

2. **使用边缘函数**
   - 将健康检查等简单操作放在边缘函数
   - 减少主函数调用

3. **压缩响应**
   - 启用 Gzip 压缩
   - 优化响应大小

## 安全考虑

1. **Token 安全**
   - 使用强密码作为 MCP_TOKEN_SECRET
   - 定期轮换 Token
   - 使用 HTTPS

2. **输入验证**
   - 验证所有输入参数
   - 限制文件大小
   - 防止注入攻击

3. **访问控制**
   - 实现 IP 白名单
   - 限制请求频率
   - 监控异常行为

## 更新部署

1. 提交代码更改
2. Vercel 自动触发部署
3. 查看部署日志
4. 验证功能正常

## 回滚

如果部署失败：

1. 进入 Vercel 项目控制台
2. 点击 "Deployments"
3. 选择之前的成功部署
4. 点击 "Redeploy"

## 成本优化

### Vercel 免费额度

- 100GB 月流量
- 10个项目
- 10个函数
- 10个构建/小时

### 优化建议

1. 合并小请求
2. 使用缓存
3. 减少函数调用次数
4. 启用边缘缓存

## 支持

如果遇到问题：

1. 查看 [Vercel 文档](https://vercel.com/docs)
2. 检查 [GitHub Issues](https://github.com/your-repo/issues)
3. 联系技术支持