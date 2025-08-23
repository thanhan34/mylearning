# PowerShell script to configure CORS for Firebase Storage
# This script needs to be run with appropriate Firebase project permissions

Write-Host "Setting up CORS configuration for Firebase Storage..." -ForegroundColor Green

# Check if gsutil is installed
$gsutilPath = Get-Command gsutil -ErrorAction SilentlyContinue
if (-not $gsutilPath) {
    Write-Host "Error: gsutil is not installed. Please install Google Cloud SDK first." -ForegroundColor Red
    Write-Host "Visit: https://cloud.google.com/sdk/docs/install" -ForegroundColor Yellow
    exit 1
}

# Check if storage.cors.json exists
if (-not (Test-Path "storage.cors.json")) {
    Write-Host "Error: storage.cors.json file not found in current directory" -ForegroundColor Red
    exit 1
}

# Get Firebase project ID from environment or prompt user
$FIREBASE_PROJECT_ID = $env:NEXT_PUBLIC_FIREBASE_PROJECT_ID
if (-not $FIREBASE_PROJECT_ID) {
    $FIREBASE_PROJECT_ID = Read-Host "Please enter your Firebase project ID"
}

if (-not $FIREBASE_PROJECT_ID) {
    Write-Host "Error: Firebase project ID is required" -ForegroundColor Red
    exit 1
}

# Apply CORS configuration
Write-Host "Applying CORS configuration to gs://$FIREBASE_PROJECT_ID.appspot.com..." -ForegroundColor Yellow

try {
    & gsutil cors set storage.cors.json "gs://$FIREBASE_PROJECT_ID.appspot.com"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ CORS configuration applied successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "You can verify the configuration with:" -ForegroundColor Cyan
        Write-Host "gsutil cors get gs://$FIREBASE_PROJECT_ID.appspot.com" -ForegroundColor White
    } else {
        Write-Host "❌ Failed to apply CORS configuration" -ForegroundColor Red
        Write-Host "Please check your permissions and try again" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "❌ Error applying CORS configuration: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🎉 Firebase Storage CORS setup complete!" -ForegroundColor Green
Write-Host "Your voice feedback feature should now work without CORS issues." -ForegroundColor Cyan

# Optional: Test the configuration
$testConfig = Read-Host "Would you like to verify the CORS configuration? (y/n)"
if ($testConfig -eq "y" -or $testConfig -eq "Y") {
    Write-Host "Current CORS configuration:" -ForegroundColor Cyan
    & gsutil cors get "gs://$FIREBASE_PROJECT_ID.appspot.com"
}
