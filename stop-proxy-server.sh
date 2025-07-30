#!/bin/bash

echo "停止 Claude 代理服务器..."

# 查找并终止进程
if pkill -f "node server.js"; then
    echo "✅ 代理服务器已停止"
else
    echo "ℹ️  代理服务器未在运行"
fi