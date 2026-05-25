#!/bin/bash
set -e

echo "=== GitHub Trending Stars - Harness Initialization ==="
echo ""

# 检查 Node.js 环境
echo "检查 Node.js 环境..."
if ! command -v node &> /dev/null; then
    echo "❌ 错误: Node.js 未安装"
    exit 1
fi

NODE_VERSION=$(node --version)
echo "✅ Node.js 版本: $NODE_VERSION"

# 检查工作目录
echo ""
echo "检查工作目录..."
WORK_DIR=$(pwd)
EXPECTED_DIR="/Users/liuth/github-trending-stars"
if [ "$WORK_DIR" != "$EXPECTED_DIR" ]; then
    echo "⚠️  警告: 当前目录不是预期目录"
    echo "   当前: $WORK_DIR"
    echo "   预期: $EXPECTED_DIR"
fi
echo "✅ 工作目录: $WORK_DIR"

# 检查必需文件
echo ""
echo "检查必需文件..."
REQUIRED_FILES=("server.js" "index.html" "AGENTS.md" "feature_list.json")
for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ 缺少文件: $file"
        exit 1
    fi
done

# 检查 server.js 语法
echo ""
echo "检查 server.js 语法..."
if node --check server.js 2>/dev/null; then
    echo "✅ server.js 语法正确"
else
    echo "❌ server.js 语法错误"
    exit 1
fi

# 检查 feature_list.json 格式
echo ""
echo "检查 feature_list.json 格式..."
if node -e "JSON.parse(require('fs').readFileSync('feature_list.json'))" 2>/dev/null; then
    echo "✅ feature_list.json 格式正确"
else
    echo "❌ feature_list.json 格式错误"
    exit 1
fi

echo ""
echo "=== 验证完成 ==="
echo ""
echo "项目状态:"
echo "  - 已完成功能: 10 个"
echo "  - 待开发功能: 8 个"
echo ""
echo "下一步操作:"
echo "  1. 启动前端服务器: ./start-server.sh"
echo "  2. 访问应用: http://127.0.0.1:8080"
echo "  3. 查看 feature_list.json 选择待开发功能"
echo ""
echo "固定端口: 8080"
echo ""
