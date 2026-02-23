#!/bin/bash
# 部署 3 步：在项目根目录执行
set -e
cd "$(dirname "$0")"

echo "=== 第 1 步：推送到 GitHub ==="
if [ ! -d .git ]; then
  git init
  git add .
  git commit -m "Prepare for Render deploy"
  echo ""
  echo "已 init 并完成首次提交。请先在 GitHub 新建空仓库（不要勾选 README），然后执行："
  echo "  git remote add origin https://github.com/你的用户名/interview-lab.git"
  echo "  git branch -M main && git push -u origin main"
  echo ""
else
  git add .
  git status
  echo "有未提交改动时请执行: git commit -m 'Prepare for Render deploy'"
  echo "再执行: git push origin main"
fi

echo ""
echo "=== 第 2 步：Groq API Key ==="
echo "打开 https://console.groq.com 注册/登录 → 创建 API Key → 复制保存，第 3 步要填。"

echo ""
echo "=== 第 3 步：Render 部署 ==="
echo "1. 打开 https://render.com 用 GitHub 登录"
echo "2. New + → Web Service → 选择本仓库 interview-lab"
echo "3. Build Command: npm run install:all && npm run build"
echo "4. Start Command: npm start"
echo "5. Instance Type: Free"
echo "6. Environment 添加 GROQ_API_KEY = 你在 Groq 控制台复制的密钥"
echo "7. Create Web Service，等几分钟后访问给出的 .onrender.com 链接即可。"
