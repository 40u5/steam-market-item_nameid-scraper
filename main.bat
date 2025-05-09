@echo off
setlocal EnableDelayedExpansion

if exist login_info.json (
  echo login_info.json already exists. Skipping setup.
  goto run
)

echo Setting up your login_info.json file...

:usernamePrompt
set /p u=Enter your Steam username: 
if "!u!"=="" (
  echo Username cannot be empty. Please try again.
  goto usernamePrompt
)

:passwordPrompt
set /p pwd=Enter your Steam password: 
if "!pwd!"=="" (
  echo Password cannot be empty. Please try again.
  goto passwordPrompt
)

(
  echo {
  echo     "username": "!u!",
  echo     "password": "!pwd!"
  echo }
) > login_info.json

echo login_info.json created successfully.

:run
echo Running main.js...
node main.js
pause

