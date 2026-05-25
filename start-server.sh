#!/bin/bash

# GitHub Trending Stars - 本地开发服务器启动脚本
# 固定使用 8080 端口

PORT=8080

echo "🚀 启动 GitHub Trending Stars 开发服务器..."
echo "📍 端口: $PORT"
echo "🌐 访问: http://127.0.0.1:$PORT"
echo ""

# 检查端口是否被占用
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  端口 $PORT 已被占用，尝试关闭现有进程..."
    lsof -Pi :$PORT -sTCP:LISTEN -t | xargs kill -9 2>/dev/null
    sleep 1
fi

# 启动服务器
echo "✅ 服务器已启动！按 Ctrl+C 停止"
python3 -m http.server $PORT --bind 127.0.0.1
