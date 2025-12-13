@echo off
echo Building DeceptiTech Extension...
echo.

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    if errorlevel 1 (
        echo Error installing dependencies!
        pause
        exit /b 1
    )
)

REM Build the extension
echo Building React app...
npm run build
if errorlevel 1 (
    echo Error building React app!
    pause
    exit /b 1
)

echo.
echo Extension built successfully!
echo.
echo To install the extension:
echo 1. Open Chrome and go to chrome://extensions/
echo 2. Enable "Developer mode" in the top right
echo 3. Click "Load unpacked" and select the 'dist' folder
echo 4. Open the test page: test-page.html
echo.
echo Press any key to open the test page...
pause >nul

REM Open test page
start test-page.html

echo.
echo Extension ready! Check chrome://extensions/ to load it.
pause
