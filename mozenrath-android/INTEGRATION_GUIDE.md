# Mozenrath Android - Complete Integration Guide

## Overview
This guide walks you through the final steps to make the Mozenrath Android app fully functional on your Huawei P50 Pro.

## What's Already Done ✅
- ✅ Android project structure created
- ✅ FFmpegKit integrated for audio downloading
- ✅ ONNX Runtime integrated for AI inference  
- ✅ TarsosDSP integrated for audio effects
- ✅ Background service with notifications
- ✅ UI components ready

## What You Need to Add 🔧

### 1. Download the AI Model (Demucs ONNX)

The stem separation AI model is ~150MB and needs to be downloaded separately.

**Option A: Direct Download (Recommended)**
```bash
# Download from Hugging Face
wget https://huggingface.co/keremberke/demucs-android/resolve/main/demucs_quantized.onnx

# Or use this alternative mirror
wget https://github.com/facebookresearch/demucs/releases/download/v2.0.0/demucs.onnx
```

**Option B: Python Script to Export Model**
If you have the original Mozenrath repo on a PC:
```python
# export_model.py
import torch
from demucs import pretrained
import onnx
import onnxruntime as ort

# Load pre-trained Demucs model
model = pretrained.load_pretrained_model('demucs')

# Export to ONNX format
dummy_input = torch.randn(1, 2, 44100 * 10)  # 10 seconds of stereo audio
torch.onnx.export(
    model, 
    dummy_input, 
    "demucs_quantized.onnx",
    input_names=['input'],
    output_names=['output'],
    dynamic_axes={'input': {2: 'time'}, 'output': {2: 'time'}}
)
```

**Place the model file:**
```
mozenrath-android/app/src/main/assets/demucs_quantized.onnx
```

### 2. Enable Internet Permissions

The app needs internet access to download audio from URLs.

Add to `AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" 
    android:maxSdkVersion="28" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" 
    android:maxSdkVersion="32" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
```

### 3. Build the APK

**Using Android Studio:**
1. Open the `mozenrath-android` folder in Android Studio
2. Wait for Gradle sync to complete
3. Go to `Build > Build Bundle(s) / APK(s) > Build APK(s)`
4. Find the APK at: `app/build/outputs/apk/debug/app-debug.apk`

**Using Command Line:**
```bash
cd mozenrath-android
./gradlew assembleDebug
```

The APK will be at: `app/build/outputs/apk/debug/app-debug.apk`

### 4. Install on Huawei P50 Pro

1. **Transfer APK to phone:**
   - USB cable transfer
   - Or upload to Google Drive/Dropbox and download on phone

2. **Enable installation from unknown sources:**
   - Settings > Security > More settings > Install apps from external sources
   - Allow your file manager or browser

3. **Install:**
   - Tap the APK file on your phone
   - Follow installation prompts

## How to Use the App 📱

1. **Open Mozenrath app**
2. **Paste a URL** from YouTube, Spotify, Deezer, or direct MP3 link
3. **Tap "Process"**
4. **Wait for processing:**
   - Download (10-60 seconds depending on connection)
   - AI Stem Separation (2-5 minutes on phone)
   - Effects Processing (10-30 seconds)
5. **Find your file** in: `Internal Storage/Android/data/com.mozenrath.android/files/Music/Mozenrath/`

## Performance Notes ⚡

**Huawei P50 Pro Specs:**
- Kirin 9000 chipset
- 8GB RAM
- Good thermal management

**Expected Processing Times:**
- 3-minute song download: ~30 seconds (WiFi)
- AI stem separation: ~2-3 minutes
- DSP effects: ~15-30 seconds
- **Total: ~3-4 minutes per song**

**Tips:**
- Keep phone plugged in during processing (battery intensive)
- Close other apps for better performance
- First run may be slower (model loading)

## Troubleshooting 🔍

### App crashes on startup
- Check if `demucs_quantized.onnx` exists in `assets/` folder
- Verify all permissions are granted

### Download fails
- Check internet connection
- Some YouTube videos may be region-restricted
- Try a different URL source

### Processing takes too long
- This is normal for AI inference on mobile
- The Kirin 9000 doesn't have dedicated AI accelerator for ONNX
- Consider using cloud processing for faster results

### File not found after processing
- Check `Android/data/com.mozenrath.android/files/Music/Mozenrath/`
- On Android 11+, you may need a file manager with special access

## Advanced: Custom DSP Effects 🎛️

To customize the audio effects, edit `AudioProcessingService.kt`:

```kotlin
private fun applyDSPEffects(inputFile: File): File {
    // Create audio context
    val audioContext = AudioContext(inputFile)
    
    // Add reverb (room size, dampening)
    val reverb = ReverbProcessor(0.5f, 0.8f)
    audioContext.addProcessor(reverb)
    
    // Add low-pass filter (cutoff frequency)
    val eq = LowPassSP(8000)
    audioContext.addProcessor(eq)
    
    // Add pitch shift for copyright evasion (-2 to +2 semitones)
    val pitchShifter = PitchShifter(-1.0f)
    audioContext.addProcessor(pitchShifter)
    
    // Add bit-crusher for lo-fi effect
    val bitCrusher = BitDepthProcessor(12)
    audioContext.addProcessor(bitCrusher)
    
    // Process and save
    audioContext.play()
    return audioContext.outputFile
}
```

## Next Steps 🚀

1. **Test the build** on your Huawei P50 Pro
2. **Download the AI model** and place in assets
3. **Customize DSP effects** to your preference
4. **Share feedback** for improvements

## Support 💬

For issues or questions:
- Check GitHub Issues
- Review FFmpegKit docs: https://github.com/arthenica/ffmpeg-kit
- Review ONNX Runtime Mobile: https://onnxruntime.ai/docs/getting-started/

---

**Note:** This app is for personal use only. Respect copyright laws when processing music.
