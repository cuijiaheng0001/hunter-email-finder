@echo off
echo 启动 Hunter 邮箱查找工具...

:: 检查Node.js是否安装
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo 错误：未检测到 Node.js，请先安装 Node.js
    pause
    exit /b 1
)

:: 检查端口是否已被占用
netstat -ano | findstr :3001 >nul 2>&1
if %errorlevel% equ 0 (
    echo Claude 代理服务器已经在运行
) else (
    echo 启动 Claude 代理服务器...
    cd /d "%~dp0claude-proxy-server"
    start /b cmd /c "npm start > ..\proxy-server.log 2>&1"
    timeout /t 3 >nul
)

:: 打开HTML文件
echo 打开 Hunter 工具...
start "" "%~dp0Hunter邮箱查找工具-完整版.html"

echo.
echo Hunter 工具已启动！
echo.
echo 提示：
echo - 代理服务器运行在: http://localhost:3001
echo - 如需停止服务器，请关闭命令行窗口
echo.
pause