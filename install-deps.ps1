Write-Host "Installing MBSPro dependencies..." -ForegroundColor Green

Write-Host "`nInstalling root dependencies..." -ForegroundColor Yellow
npm install

Write-Host "`nInstalling API dependencies..." -ForegroundColor Yellow
Set-Location apps\api
npm install
Set-Location ..\..

Write-Host "`nInstalling Web dependencies..." -ForegroundColor Yellow
Set-Location apps\web
npm install
Set-Location ..\..

Write-Host "`nInstalling Shared package dependencies..." -ForegroundColor Yellow
Set-Location packages\shared
npm install
Set-Location ..\..

Write-Host "`nDependencies installation completed!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "1. Set up your Supabase project" -ForegroundColor White
Write-Host "2. Copy apps\api\env.example to apps\api\.env" -ForegroundColor White
Write-Host "3. Update .env with your Supabase credentials" -ForegroundColor White
Write-Host "4. Run the seed script: npm run seed:supabase" -ForegroundColor White
Write-Host "5. Start development: npm run dev" -ForegroundColor White

Read-Host "`nPress Enter to continue"
