@echo off
chcp 65001 >nul

REM 设置环境变量
set SUPABASE_URL=https://ioquklhxeisulnagkauo.supabase.co
set SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlvcXVrbGh4ZWlzdWxuYWdrYXVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY2OTg5NjY4NSwiZXhwIjoyMDg1NDcyNjg1fQ.avoO6BPgy_OODj-iYTuZeA8tpYrurCpSBYrynWVHu7w

REM 切换到脚本目录
cd /d "%~dp0"

REM 运行调度器
node dist\index.js

pause
