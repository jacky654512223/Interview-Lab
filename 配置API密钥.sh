#!/bin/bash

echo "🔑 Interview Lab - API Key 配置助手"
echo "=================================="
echo ""

ENV_FILE="server/.env"

# 检查文件是否存在
if [ ! -f "$ENV_FILE" ]; then
    echo "创建 $ENV_FILE 文件..."
    cp server/.env.example "$ENV_FILE"
fi

echo "当前配置："
grep "OPENAI_API_KEY" "$ENV_FILE" | head -1
echo ""

echo "请输入你的 OpenAI API Key（格式：sk-xxx...）"
echo "提示：如果还没有，请访问 https://platform.openai.com/api-keys 获取"
echo ""
read -p "API Key: " api_key

# 验证输入
if [ -z "$api_key" ]; then
    echo "❌ 错误：API Key 不能为空"
    exit 1
fi

if [[ ! "$api_key" =~ ^sk- ]]; then
    echo "⚠️  警告：API Key 格式可能不正确（应以 sk- 开头）"
    read -p "是否继续？(y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 更新 .env 文件
# 使用 sed 替换，如果不存在则添加
if grep -q "^OPENAI_API_KEY=" "$ENV_FILE"; then
    # macOS 和 Linux 兼容的 sed 命令
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|^OPENAI_API_KEY=.*|OPENAI_API_KEY=$api_key|" "$ENV_FILE"
    else
        sed -i "s|^OPENAI_API_KEY=.*|OPENAI_API_KEY=$api_key|" "$ENV_FILE"
    fi
else
    echo "OPENAI_API_KEY=$api_key" >> "$ENV_FILE"
fi

echo ""
echo "✅ 配置完成！"
echo ""
echo "更新后的配置："
grep "OPENAI_API_KEY" "$ENV_FILE" | grep -v "^#" | head -1
echo ""
echo "提示：API Key 已保存，现在可以运行 ./快速启动.sh 启动服务了"
