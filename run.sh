#!/bin/bash
# 启动脚本

echo "邮箱查找工具启动中..."

# 检查Python
if ! command -v python3 &> /dev/null; then
    echo "错误: 未找到 Python 3"
    exit 1
fi

# 检查并安装依赖
if [ ! -d "venv" ]; then
    echo "创建虚拟环境..."
    python3 -m venv venv
fi

# 激活虚拟环境
source venv/bin/activate

# 安装依赖
echo "检查依赖..."
pip install -q -r requirements.txt

# 检查API密钥
if [ -z "$HUNTER_API_KEY" ]; then
    if [ -f ".env" ]; then
        export $(cat .env | grep -v '^#' | xargs)
    fi
fi

if [ -z "$HUNTER_API_KEY" ] || [ "$HUNTER_API_KEY" = "your_api_key_here" ]; then
    echo "警告: 未设置 Hunter.io API 密钥"
    echo "请编辑 .env 文件或设置环境变量 HUNTER_API_KEY"
fi

# 启动服务器
echo "启动服务器..."
echo "访问地址: http://localhost:5000"
python app.py