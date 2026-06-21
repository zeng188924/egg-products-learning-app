@echo off
title 蛋鸡产品学习助手 - 启动中
echo.
echo ========================================
echo    蛋鸡四大产品学习助手
echo    正在启动开发服务器...
echo ========================================
echo.
echo 提示：如果浏览器没有自动打开，
echo 请手动访问：http://localhost:5173
echo.
cd /d "%~dp0"
if exist "node_modules" (
    echo 依赖已安装，正在启动...
    npm run dev
) else (
    echo 正在安装依赖...
    npm install
    if %errorlevel% equ 0 (
        echo 依赖安装成功，正在启动开发服务器...
        npm run dev
    ) else (
        echo 依赖安装失败，请检查网络连接
        pause
    )
)
