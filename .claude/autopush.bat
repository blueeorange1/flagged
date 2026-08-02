@echo off
cd /d "%CLAUDE_PROJECT_DIR%"
git add -A
git diff --cached --quiet
if %errorlevel%==0 exit /b 0
set N=1
for /f %%i in ('git rev-list --count HEAD 2^>nul') do set /a N=%%i+1
git commit -q -m "commit %N%"
git push -q origin HEAD
exit /b 0
