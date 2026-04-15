#!/bin/bash
#
# 开发服务器
# Tailwind 由 CDN 在浏览器端实时编译，无 CSS 缓存问题
#
# 用法: ./dev.sh

cd "$(dirname "$0")"

PORT=1313

# 检查端口占用
if lsof -i :$PORT > /dev/null 2>&1; then
  echo "端口 $PORT 已被占用，正在关闭旧进程..."
  lsof -ti :$PORT | xargs kill -9 2>/dev/null
  sleep 1
fi

echo "================================"
echo "  Blog 开发服务器"
echo "  http://localhost:$PORT"
echo "  Ctrl+C 停止"
echo "================================"
echo ""

hugo server \
  -D \
  --disableFastRender \
  --navigateToChanged \
  --port $PORT \
  --bind 0.0.0.0
