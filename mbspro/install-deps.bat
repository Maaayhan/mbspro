@echo off
echo Installing MBSPro dependencies...

echo.
echo Installing root dependencies...
npm install

echo.
echo Installing API dependencies...
cd apps\api
npm install
cd ..\..

echo.
echo Installing Web dependencies...
cd apps\web
npm install
cd ..\..

echo.
echo Installing Shared package dependencies...
cd packages\shared
npm install
cd ..\..

echo.
echo Dependencies installation completed!
echo.
echo Next steps:
echo 1. Set up your Supabase project
echo 2. Copy apps\api\env.example to apps\api\.env
echo 3. Update .env with your Supabase credentials
echo 4. Run the seed script: npm run seed:supabase
echo 5. Start development: npm run dev
pause
