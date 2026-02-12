@echo off
:: Vercel 部署脚本 (Windows)

echo 🚀 开始部署 Wechatsync 到 Vercel...

:: 检查是否已登录
vercel whoami >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  请先登录 Vercel:
    echo    vercel login
    echo    然后按照提示完成 OAuth 登录
    pause
    exit /b 1
)

:: 检查 pnpm 是否安装
pnpm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  pnpm 未安装，请先安装 pnpm
    pause
    exit /b 1
)

:: 安装依赖
echo 📦 安装依赖...
pnpm install

:: 构建项目
echo 🔨 构建项目...
pnpm build

:: 部署到 Vercel
echo 🚀 部署到 Vercel...
vercel --prod

echo ✅ 部署完成！
echo.
echo 📊 运行部署测试:
echo    node test-deployment.js

pause