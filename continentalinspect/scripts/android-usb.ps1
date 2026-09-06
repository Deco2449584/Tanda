# Connect phone via USB and forward Metro port to the device.
# Usage: npm run dev:android
adb reverse tcp:8081 tcp:8081
if ($LASTEXITCODE -ne 0) {
  Write-Error "adb could not find a device. Enable USB debugging and accept the authorization prompt."
  exit 1
}
Write-Host "Port 8081 forwarded. Starting Expo in localhost mode..."
npx expo start --localhost
