@echo off
REM Make a user an admin in Applytide
REM Usage: make-admin.bat user@example.com

if "%1"=="" (
    echo Usage: make-admin.bat ^<email^>
    echo Example: make-admin.bat john@example.com
    exit /b 1
)

cd backend
python scripts/make_admin.py %1
cd ..
