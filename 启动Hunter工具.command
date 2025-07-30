#!/bin/bash

# 切换到脚本所在目录
cd "$(dirname "$0")"

# 调用启动脚本
./start-hunter.sh

# 保持终端窗口打开几秒钟查看信息
sleep 5