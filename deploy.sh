#!/bin/bash

# Vercel 部署脚本

echo "🚀 开始部署 Wechatsync 到 Vercel..."

# 检查是否已登录
if ! vercel whoami > /dev/null 2>&1; then
    echo "⚠️  请先登录 Vercel:"
    echo "   vercel login"
    echo "   然后按照提示完成 OAuth 登录"
    exit 1
fi

# 检查环境变量
echo "📋 检查环境变量..."
if [ -z "$MCP_TOKEN_SECRET" ]; then
    echo "⚠️  MCP_TOKEN_SECRET 未设置，将在 Vercel 控制台中配置"
fi

# 安装依赖
echo "📦 安装依赖..."
pnpm install

# 构建项目
echo "🔨 构建项目..."
pnpm build

# 部署到 Vercel
echo "🚀 部署到 Vercel..."
vercel --prod

echo "✅ 部署完成！"
echo ""
echo "📊 运行部署测试:"
echo "   node test-deployment.js"