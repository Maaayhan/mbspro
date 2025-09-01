#!/bin/bash

# MBSPro Render 部署脚本
# 使用方法: ./deploy-to-render.sh

set -e

echo "🚀 开始部署 MBSPro 到 Render..."

# 检查是否在正确的分支
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "deploy/onrender" ]; then
    echo "❌ 请先切换到 deploy/onrender 分支"
    echo "运行: git checkout deploy/onrender"
    exit 1
fi

# 检查是否有未提交的更改
if [ -n "$(git status --porcelain)" ]; then
    echo "❌ 有未提交的更改，请先提交或暂存"
    git status
    exit 1
fi

# 推送代码到远程仓库
echo "📤 推送代码到远程仓库..."
git push origin deploy/onrender

echo "✅ 代码已推送到 GitHub"
echo ""
echo "📋 接下来的步骤："
echo "1. 访问 https://render.com"
echo "2. 登录你的账户"
echo "3. 点击 'New +' → 'Blueprint'"
echo "4. 连接你的 GitHub 仓库"
echo "5. 选择 'deploy/onrender' 分支"
echo "6. 配置环境变量（参考 RENDER_DEPLOYMENT.md）"
echo "7. 部署服务"
echo ""
echo "📖 详细说明请查看: RENDER_DEPLOYMENT.md"
echo ""
echo "🔗 部署完成后，你将获得两个 URL："
echo "   - API: https://mbspro-api.onrender.com"
echo "   - Web: https://mbspro-web.onrender.com"
