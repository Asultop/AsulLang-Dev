@echo off
setlocal enabledelayedexpansion

:: ALang VSCode Extension - Automated Build and Package Script (Windows)
:: This script automatically builds and packages the extension to build\ directory

set "EXTENSION_DIR=%~dp0"
set "BUILD_DIR=%EXTENSION_DIR%build"
cd /d "%EXTENSION_DIR%"

echo ==========================================
echo ALang VSCode Extension Build Script
echo ==========================================
echo.
echo Build directory: %BUILD_DIR%
echo.

:: Parse command
set "CMD=%~1"
if "%CMD%"=="" set "CMD=full"

if /i "%CMD%"=="validate" goto :validate
if /i "%CMD%"=="check" goto :validate
if /i "%CMD%"=="package" goto :package
if /i "%CMD%"=="build" goto :package
if /i "%CMD%"=="test" goto :test
if /i "%CMD%"=="clean" goto :clean
if /i "%CMD%"=="full" goto :full
if /i "%CMD%"=="all" goto :full
if /i "%CMD%"=="help" goto :help
if /i "%CMD%"=="--help" goto :help
if /i "%CMD%"=="-h" goto :help
echo Unknown command: %CMD%
goto :help

:: ============================================================
:full
echo === Full Build Process ===
echo.
call :show_info
call :install_dependencies
call :compile_typescript
call :package_extension
call :show_install_instructions
goto :eof

:: ============================================================
:validate
call :validate_json
call :check_files
call :show_info
goto :eof

:: ============================================================
:package
call :validate_json
call :check_files
call :show_info
call :package_extension
call :show_install_instructions
goto :eof

:: ============================================================
:test
call :run_tests
goto :eof

:: ============================================================
:clean
echo Cleaning build artifacts...
if exist "%BUILD_DIR%\*.vsix" del /q "%BUILD_DIR%\*.vsix"
if exist "client\out" rmdir /s /q "client\out"
if exist "server\out" rmdir /s /q "server\out"
if exist "node_modules" rmdir /s /q "node_modules"
if exist "client\node_modules" rmdir /s /q "client\node_modules"
if exist "server\node_modules" rmdir /s /q "server\node_modules"
echo   [OK] Cleaned build artifacts
echo.
goto :eof

:: ============================================================
:help
echo Usage: build.bat [command]
echo.
echo Commands:
echo   validate  - Validate JSON files and check required files
echo   full^|all  - Complete build: install deps, compile, package ^(default^)
echo   package   - Package extension to build\ directory
echo   test      - Run tests ^(check example files^)
echo   clean     - Remove all build artifacts
echo   help      - Show this help message
echo.
echo Default ^(no command^): full build
goto :eof

:: ============================================================
:: Function: install_dependencies
:: ============================================================
:install_dependencies
echo Installing dependencies...

where npm >nul 2>&1
if errorlevel 1 (
    echo   [X] npm not found! Please install Node.js and npm.
    exit /b 1
)

if exist "package.json" (
    echo   Installing root dependencies...
    call npm install 2>&1
)

if exist "client\package.json" (
    echo   Installing client dependencies...
    pushd client
    call npm install 2>&1
    popd
)

if exist "server\package.json" (
    echo   Installing server dependencies...
    pushd server
    call npm install 2>&1
    popd
)

echo   [OK] Dependencies installed
echo.
goto :eof

:: ============================================================
:: Function: compile_typescript
:: ============================================================
:compile_typescript
echo Compiling TypeScript...

call npx tsc -b
if errorlevel 1 (
    echo   [X] TypeScript compilation failed!
    exit /b 1
)

echo   [OK] TypeScript compiled successfully

if exist "client\out\extension.js" (
    if exist "server\out\server.js" (
        echo   [OK] Output files verified:
        echo     - client\out\extension.js
        echo     - server\out\server.js
    ) else (
        echo   [X] server\out\server.js not found!
        exit /b 1
    )
) else (
    echo   [X] client\out\extension.js not found!
    exit /b 1
)

echo.
goto :eof

:: ============================================================
:: Function: validate_json
:: ============================================================
:validate_json
echo Validating JSON files...

for %%f in (package.json language-configuration.json syntaxes\alang.tmLanguage.json) do (
    if exist "%%f" (
        node -e "JSON.parse(require('fs').readFileSync('%%f', 'utf8'))" >nul 2>&1
        if errorlevel 1 (
            echo   [X] %%f is INVALID!
            exit /b 1
        ) else (
            echo   [OK] %%f is valid
        )
    ) else (
        echo   [X] %%f not found!
        exit /b 1
    )
)

echo.
goto :eof

:: ============================================================
:: Function: check_files
:: ============================================================
:check_files
echo Checking required files...

for %%f in (package.json language-configuration.json syntaxes\alang.tmLanguage.json README.md CHANGELOG.md) do (
    if exist "%%f" (
        echo   [OK] %%f exists
    ) else (
        echo   [X] %%f is missing!
        exit /b 1
    )
)

if exist "images\icon.png" (
    echo   [OK] images\icon.png exists
) else (
    echo   [!] images\icon.png missing ^(optional^)
)

echo.
goto :eof

:: ============================================================
:: Function: show_info
:: ============================================================
:show_info
echo Extension Information:
for /f "delims=" %%v in ('node -pe "JSON.parse(require('fs').readFileSync('package.json','utf8')).name"') do echo   Name: %%v
for /f "delims=" %%v in ('node -pe "JSON.parse(require('fs').readFileSync('package.json','utf8')).displayName"') do echo   Display Name: %%v
for /f "delims=" %%v in ('node -pe "JSON.parse(require('fs').readFileSync('package.json','utf8')).version"') do echo   Version: %%v
for /f "delims=" %%v in ('node -pe "JSON.parse(require('fs').readFileSync('package.json','utf8')).publisher"') do echo   Publisher: %%v
echo.
goto :eof

:: ============================================================
:: Function: package_extension
:: ============================================================
:package_extension
echo Packaging extension to build directory...

if not exist "%BUILD_DIR%" mkdir "%BUILD_DIR%"

for /f "delims=" %%v in ('node -pe "JSON.parse(require('fs').readFileSync('package.json','utf8')).version"') do set "VERSION=%%v"
for /f "delims=" %%v in ('node -pe "JSON.parse(require('fs').readFileSync('package.json','utf8')).name"') do set "NAME=%%v"

set "VSIX_NAME=!NAME!-!VERSION!.vsix"
set "OUTPUT_PATH=%BUILD_DIR%\!VSIX_NAME!"

echo   Creating package: !VSIX_NAME!

call npx @vscode/vsce package --out "!OUTPUT_PATH!"
if errorlevel 1 (
    echo   [X] Packaging failed!
    exit /b 1
)

echo.
echo   [OK] Extension packaged successfully!
echo   Package: build\!VSIX_NAME!

if exist "!OUTPUT_PATH!" (
    for %%A in ("!OUTPUT_PATH!") do echo   Size: %%~zA bytes
)

echo.
goto :eof

:: ============================================================
:: Function: show_install_instructions
:: ============================================================
:show_install_instructions
echo ==========================================
echo Installation Instructions
echo ==========================================
echo.
echo The .vsix package has been created in: build\
echo.
echo To install the extension:
echo.
echo Method 1: Using VSCode UI
echo   1. Open VSCode
echo   2. Go to Extensions ^(Ctrl+Shift+X^)
echo   3. Click '...' menu -^> 'Install from VSIX...'
echo   4. Navigate to build\ and select the .vsix file
echo.
echo Method 2: Using command line

for /f "delims=" %%v in ('node -pe "JSON.parse(require('fs').readFileSync('package.json','utf8')).version"') do set "VERSION=%%v"
for /f "delims=" %%v in ('node -pe "JSON.parse(require('fs').readFileSync('package.json','utf8')).name"') do set "NAME=%%v"
echo   code --install-extension build\!NAME!-!VERSION!.vsix

echo.
echo Method 3: Manual installation (development)
echo   See INSTALL.md for detailed instructions
echo.
goto :eof

:: ============================================================
:: Function: run_tests
:: ============================================================
:run_tests
echo Running tests...

if exist "examples" (
    echo   Found example files:
    for %%f in (examples\*.alang) do echo     - %%~nxf
) else (
    echo   [!] No examples directory found
)

echo.
goto :eof
