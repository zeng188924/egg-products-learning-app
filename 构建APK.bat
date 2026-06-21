@echo off
title 蛋鸡产品学习助手 - 构建Android APK
echo.
echo ========================================
echo    蛋鸡产品学习助手
echo    正在构建Android APK...
echo ========================================
echo.

cd /d "%~dp0"

echo [1/4] 检查环境...
where java >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Java未安装或未配置JAVA_HOME环境变量
    echo 请先安装JDK 11或更高版本
    echo 下载地址：https://www.oracle.com/java/technologies/downloads/
    pause
    exit /b 1
)

echo ✓ Java环境检查通过

echo.
echo [2/4] 检查Node.js...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js未安装
    echo 请先安装Node.js
    echo 下载地址：https://nodejs.org/
    pause
    exit /b 1
)

echo ✓ Node.js环境检查通过

echo.
echo [3/4] 安装依赖...
if not exist "node_modules" (
    npm install
    if %errorlevel% neq 0 (
        echo ❌ 依赖安装失败
        pause
        exit /b 1
    )
)
echo ✓ 依赖检查通过

echo.
echo [4/4] 构建Web应用...
npm run build
if %errorlevel% neq 0 (
    echo ❌ Web应用构建失败
    pause
    exit /b 1
)
echo ✓ Web应用构建成功

echo.
echo 正在同步到Android平台...
npx cap sync android
if %errorlevel% neq 0 (
    echo ❌ 同步失败
    pause
    exit /b 1
)
echo ✓ 同步成功

echo.
echo 正在构建Android APK...
echo 这可能需要几分钟时间，请耐心等待...
echo.

cd android
./gradlew assembleDebug
if %errorlevel% neq 0 (
    echo.
    echo ❌ APK构建失败
    echo.
    echo 可能的解决方案：
    echo 1. 检查Android SDK是否正确安装
    echo 2. 确保ANDROID_HOME环境变量已设置
    echo 3. 检查Gradle配置是否正确
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo ✓ APK构建成功！
echo ========================================
echo.
echo APK文件位置：
echo %~dp0android\app\build\outputs\apk\debug\app-debug.apk
echo.
echo 下一步操作：
echo 1. 将APK文件传输到手机
echo 2. 在手机中安装APK
echo 3. 如果提示安全警告，需要在设置中允许安装未知来源应用
echo.
echo 是否打开APK所在目录？(Y/N)
set /p choice=
if /i "%choice%"=="Y" start explorer "%~dp0android\app\build\outputs\apk\debug"
echo.
pause
