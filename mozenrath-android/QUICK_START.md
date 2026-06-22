# Mozenrath Android - Quick Start

## 🚀 3-Minute Setup for Huawei P50 Pro

### Step 1: Open in Android Studio (1 min)
```bash
# Navigate to project
cd /workspace/mozenrath-android

# Open Android Studio and select this folder
# OR from command line:
studio /workspace/mozenrath-android
```

### Step 2: Let Gradle Sync (1 min)
- Android Studio will automatically download dependencies
- Wait for "Gradle sync finished" in bottom status bar
- **Dependencies downloaded**: ~200MB total
  - FFmpegKit (~50MB)
  - ONNX Runtime (~30MB)
  - ExoPlayer (~40MB)
  - Material Components (~20MB)
  - Other libraries (~60MB)

### Step 3: Build APK (1 min)
```bash
# Option A: Command Line
./gradlew assembleDebug

# Option B: Android Studio Menu
Build → Build Bundle(s) / APK(s) → Build APK(s)
```

Output location: `app/build/outputs/apk/debug/app-debug.apk`

### Step 4: Install on Huawei P50 Pro

**Method A: USB Cable (Recommended)**
```bash
# Enable Developer Options on phone:
# Settings → About Phone → Tap "Build Number" 7 times

# Enable USB Debugging:
# Settings → System & Updates → Developer Options → USB Debugging

# Connect phone and run:
adb install app/build/outputs/apk/debug/app-debug.apk
```

**Method B: Direct Transfer**
1. Copy `app-debug.apk` to phone (via USB, email, cloud)
2. On phone: Settings → Security → Enable "Install unknown apps" for your file manager
3. Tap APK file → Install

---

## 📱 First Use

### Launch App
1. Tap Mozenrath icon
2. Grant permissions when prompted:
   - ✅ Storage/Files
   - ✅ Notifications (Android 13+)

### Process Your First Track
1. **Paste URL**: YouTube, SoundCloud, or direct MP3 link
2. **Tap "Process Audio"**
3. **Wait 3-6 minutes**:
   - AI model downloads first time (~150MB)
   - Audio downloads (30-60 sec)
   - Vocals removed by AI (2-4 min)
   - Effects applied (15-30 sec)
4. **Preview**: Tap play button
5. **Adjust**: Try preset chips or move sliders
6. **Share**: Send to friends!

---

## 🎯 Quick Tips

### Presets for Instant Results
- **🎵 Lofi Hip Hop**: Chill, dusty beats
- **⚡ Nightcore**: Fast, high-pitched
- **🌌 Cosmic Reverb**: Spacy, atmospheric
- **💿 Analog Warmth**: Vintage vinyl sound

### Manual Controls
- **Reverb**: Adds space/depth (30-50% recommended)
- **Bass Boost**: Enhances low end (20-40% recommended)
- **Vinyl Crackle**: Retro texture (0-25% subtle, 50%+ obvious)
- **Speed**: 0.5x (slow) to 1.5x (fast), 1.0x = normal

### Best Practices
- Use WiFi for first launch (AI model download)
- Keep app open during processing (or check notifications)
- Export to Music folder for permanent storage
- Share directly to social apps

---

## 🔧 Troubleshooting

### "Gradle sync failed"
- Check internet connection
- File → Invalidate Caches → Restart

### "Build failed"
- Ensure JDK 17 is installed
- Tools → SDK Manager → Install Android 34 SDK

### "Install blocked"
- Enable "Install unknown apps" for your file manager
- Settings → Security → More settings → Install unknown apps

### "App crashes on launch"
- Clear app data: Settings → Apps → Mozenrath → Storage → Clear Data
- Reinstall APK

### "Processing fails"
- Try a different URL (some sources block downloads)
- Check internet connection
- Restart app

---

## 📊 What You Get

✅ **Auto-downloading AI model** (no manual 150MB file)  
✅ **Real-time progress updates** (0-100% progress bar)  
✅ **Functional effect controls** (4 sliders with live values)  
✅ **One-tap presets** (4 professional sound profiles)  
✅ **Full audio player** (play/pause/seek with time display)  
✅ **Share & export** (send to any app or save to Music folder)  
✅ **Background processing** (use other apps while processing)  
✅ **Error handling** (clear messages, no silent failures)  
✅ **Material Design UI** (modern, polished interface)  

---

## 🎉 You're Ready!

The app is now fully functional on your Huawei P50 Pro. Enjoy creating copyright-neutral instrumentals anywhere, anytime!

For detailed documentation, see:
- `BUILD_GUIDE.md` - Complete build instructions
- `FEATURE_OVERVIEW.md` - All features explained

Happy producing! 🎶
