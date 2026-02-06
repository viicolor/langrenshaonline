@echo off
chcp 65001 >nul
echo ============================================
echo   狼人杀游戏流程调度器
echo ============================================
echo.

REM 检查环境变量
if "%SUPABASE_URL%"=="" (
    echo [错误] 需要设置环境变量 SUPABASE_URL
    echo 例如: set SUPABASE_URL=https://your-project.supabase.co
    goto :eof
)

if "%SUPABASE_SERVICE_ROLE_KEY%"=="" (
    echo [错误] 需要设置环境变量 SUPABASE_SERVICE_ROLE_KEY
    echo 请在 Supabase Dashboard > Settings > API 中获取
    goto :eof
)

echo [信息] SUPABASE_URL: %SUPABASE_URL%
echo.

REM 安装依赖并运行
echo [步骤 1/3] 安装依赖...
cd /d "%~dp0"
call npm install

echo.
echo [步骤 2/3] 编译 TypeScript...
call npm run build

echo.
echo [步骤 3/3] 运行调度器...
echo [提示] 按 Ctrl+C 可随时停止
echo.
call npm start

pause
