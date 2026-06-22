# Mozenrath Android - Build Instructions

## Prerequisites

1. **Android Studio** (Arctic Fox or newer)
   - Download from: https://developer.android.com/studio

2. **JDK 17** (usually bundled with Android Studio)

3. **Android SDK** with:
   - Android 14 (API 34) platform
   - Build Tools 34.0.0

## Building the APK

### Option 1: Using Android Studio (Recommended for Normal Users)

1. **Open the project:**
   - Launch Android Studio
   - Click "Open" and select the `mozenrath-android` folder

2. **Sync Gradle:**
   - Android Studio will automatically sync Gradle files
   - Wait for "Gradle sync finished" message

3. **Build APK:**
   - Go to `Build` → `Build Bundle(s) / APK(s)` → `Build APK(s)`
   - Wait for build to complete (2-5 minutes first time)

4. **Find the APK:**
   - Location: `app/build/outputs/apk/debug/app-debug.apk`
   - Copy this file to your Huawei P50 Pro

### Option 2: Command Line (Advanced)

```bash
# Navigate to project directory
cd mozenrath-android

# Make gradlew executable (Linux/Mac only)
chmod +x gradlew

# Build debug APK
./gradlew assembleDebug

# Build release APK (requires signing)
./gradlew assembleRelease
```

APK location: `app/build/outputs/apk/debug/app-debug.apk`

## Installing on Huawei P50 Pro

1. **Transfer APK to phone:**
   - Use USB cable, email, cloud storage, or Huawei Share

2. **Enable installation from unknown sources:**
   - Settings → Security → More settings → Install apps from external sources
   - Enable for your file manager or browser

3. **Install:**
   - Open the APK file on your phone
   - Tap "Install"
   - Wait for installation to complete

4. **Grant permissions:**
   - Open the app
   - Grant storage and network permissions when prompted

## First Run

1. Open Mozenrath app
2. Paste a YouTube/Spotify URL
3. Tap "Process Audio"
4. Wait 2-5 minutes for AI processing
5. Find output in: `Internal Storage/Music/Mozenrath/`

## Troubleshooting

### Build fails with "SDK not found"
- Open Android Studio → Tools → SDK Manager
- Install Android 14 (API 34)

### App crashes on startup
- Check logcat in Android Studio for errors
- Ensure all permissions are granted

### Processing is very slow
- This is normal on mobile (2-5 min per song)
- Keep phone plugged in during processing
- Close other apps to free up RAM

### Out of memory error
- Try shorter songs first (< 4 minutes)
- Restart the app to clear memory

## Advanced: Custom AI Models

To use different stem separation models:

1. Convert model to ONNX format
2. Quantize for mobile (reduce size)
3. Place in `app/src/main/assets/`
4. Update `AudioProcessingService.kt` to load new model

## File Structure

```
mozenrath-android/
├── app/
│   ├── src/main/
│   │   ├── java/com/mozenrath/android/
│   │   │   ├── MainActivity.kt
│   │   │   └── AudioProcessingService.kt
│   │   ├── res/
│   │   │   ├── layout/activity_main.xml
│   │   │   └── values/
│   │   └── AndroidManifest.xml
│   └── build.gradle
├── build.gradle
└── README.md
```

## Next Steps for Full Functionality

This is a scaffold project. To make it fully functional:

1. **Integrate yt-dlp:** 
   - Use FFmpegKit or port yt-dlp to Kotlin
   
2. **Add AI Model:**
   - Export quantized Demucs model to ONNX
   - Add to assets folder (~150MB)
   
3. **Implement DSP:**
   - Use Oboe library for real-time audio effects
   - Or integrate Superpowered SDK

4. **Test thoroughly** on actual device before distribution
