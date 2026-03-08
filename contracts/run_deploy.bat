@echo off
echo Starting deployment...
cd c:\Users\ultra\Desktop\dorahack\contracts
call npm run deploy:somnia > deploy_log.txt 2>&1
echo Deployment finished.
