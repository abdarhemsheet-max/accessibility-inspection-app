@echo off
title دفع النظام إلى GitHub
echo ========================================
echo   دفع نظام تقييم الوصول الشامل إلى GitHub
echo ========================================
echo.

:: تنظيف أي ملفات حساسة
if exist .env del .env
if exist deploy-github.mjs del deploy-github.mjs

:: إضافة ودفع
git add -A
git commit -m "النظام الكامل - %date%"
git push origin master

echo.
echo ========================================
echo   تم الدفع! بعدها اذهب إلى:
echo   https://github.com/abdarhemsheet-max/accessibility-inspection-app/settings/pages
echo   واختر: Source = GitHub Actions
echo ========================================
pause
