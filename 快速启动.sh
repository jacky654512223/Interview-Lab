#!/bin/bash

echo "🚀 Interview Lab v0.1 - 快速启动脚本"
echo "=================================="
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 错误：未检测到 Node.js"
    echo "请先安装 Node.js：https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js 版本：$(node --version)"
echo ""

# 检查是否已安装依赖
if [ ! -d "node_modules" ] || [ ! -d "server/node_modules" ] || [ ! -d "client/node_modules" ]; then
    echo "📦 正在安装依赖（首次运行需要 1-2 分钟）..."
    npm run install:all
    if [ $? -ne 0 ]; then
        echo "❌ 依赖安装失败，请检查网络连接"
        exit 1
    fi
    echo "✅ 依赖安装完成"
    echo ""
else
    echo "✅ 依赖已安装"
    echo ""
fi

# 检查 .env 文件
if [ ! -f "server/.env" ]; then
    echo "⚠️  警告：未找到 server/.env 文件"
    echo ""
    echo "请按以下步骤配置 OpenAI API Key："
    echo "1. 访问 https://platform.openai.com/api-keys 获取 API Key"
    echo "2. 在 server 目录下创建 .env 文件"
    echo "3. 添加内容：OPENAI_API_KEY=sk-xxx（替换为你的真实 key）"
    echo ""
    read -p "是否现在创建 .env 文件？(y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if [ -f "server/.env.example" ]; then
            cp server/.env.example server/.env
            echo "✅ 已创建 server/.env 文件"
            echo "⚠️  请编辑 server/.env，填入你的 OPENAI_API_KEY"
            echo ""
            read -p "按回车键继续启动（请确保已配置 API Key）..."
        else
            echo "OPENAI_API_KEY=sk-your-key-here" > server/.env
            echo "✅ 已创建 server/.env 文件"
            echo "⚠️  请编辑 server/.env，填入你的 OPENAI_API_KEY"
            echo ""
            read -p "按回车键继续启动（请确保已配置 API Key）..."
        fi
    else
        echo "❌ 请先配置 .env 文件后再启动"
        exit 1
    fi
else
    # 检查 .env 是否包含有效的 key
    if grep -q "OPENAI_API_KEY=sk-" server/.env && ! grep -q "OPENAI_API_KEY=sk-your-key-here" server/.env; then
        echo "✅ 已检测到 .env 配置文件"
    else
        echo "⚠️  警告：.env 文件中的 API Key 可能未配置"
        echo "请确保 server/.env 中包含：OPENAI_API_KEY=sk-xxx（你的真实 key）"
        echo ""
        read -p "按回车键继续启动（请确保已配置 API Key）..."
    fi
fi

echo ""
echo "🎯 启动服务..."
echo "前端地址：http://localhost:5173"
echo "后端地址：http://localhost:3001"
echo ""
echo "按 Ctrl+C 停止服务"
echo "=================================="
echo ""

npm run dev
