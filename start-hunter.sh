#!/bin/bash

echo "🚀 启动 Hunter 邮箱查找工具..."

# 检查代理服务器是否已经在运行
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null ; then
    echo "✅ Claude 代理服务器已经在运行"
else
    echo "⏳ 启动 Claude 代理服务器..."
    cd "$(dirname "$0")/claude-proxy-server"
    npm start > ../proxy-server.log 2>&1 &
    echo "✅ Claude 代理服务器已启动 (PID: $!)"
    
    # 等待服务器启动
    sleep 2
fi

# 打开 HTML 文件
HTML_FILE="$(dirname "$0")/Hunter邮箱查找工具-完整版.html"
echo "🌐 打开 Hunter 工具..."

# 根据操作系统打开文件
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    open "$HTML_FILE"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    xdg-open "$HTML_FILE"
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    # Windows
    start "$HTML_FILE"
fi

echo "✨ Hunter 工具已启动！"
echo ""
echo "提示："
echo "- 代理服务器运行在: http://localhost:3001"
echo "- 查看服务器日志: cat proxy-server.log"
echo "- 停止服务器: pkill -f 'node server.js'"