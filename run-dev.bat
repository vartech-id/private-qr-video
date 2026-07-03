@echo off
setlocal EnableExtensions

pushd "%~dp0" || (
  echo Failed to enter project directory.
  pause
  exit /b 1
)

where bun >nul 2>nul
if errorlevel 1 (
  set "EXIT_CODE=%ERRORLEVEL%"
  echo Bun not found on PATH.
  goto :fail
)

echo Running Prisma migration...
call bun run db:migrate
if errorlevel 1 (
  set "EXIT_CODE=%ERRORLEVEL%"
  echo Migration failed.
  goto :fail
)

echo Running Prisma generate...
call bun run db:generate
if errorlevel 1 (
  set "EXIT_CODE=%ERRORLEVEL%"
  echo Prisma generate failed.
  goto :fail
)

echo Starting dev server...
echo Browser will open when Nuxt is ready.
call bun run dev --open
set "EXIT_CODE=%ERRORLEVEL%"

echo.
echo Dev server stopped with exit code %EXIT_CODE%.
popd
pause
exit /b %EXIT_CODE%

:fail
if not defined EXIT_CODE set "EXIT_CODE=%ERRORLEVEL%"
echo.
echo Script failed with exit code %EXIT_CODE%.
popd
pause
exit /b %EXIT_CODE%
