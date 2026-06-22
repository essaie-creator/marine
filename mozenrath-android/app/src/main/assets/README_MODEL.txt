# README: AI Model File Required

## ⚠️ IMPORTANT: Download the AI Model First

This app requires a separate AI model file (~150MB) for stem separation.

### Quick Download

**Option 1: Direct Download (Recommended)**
```bash
cd app/src/main/assets/

# Download from Hugging Face
wget https://huggingface.co/keremberke/demucs-android/resolve/main/demucs_quantized.onnx

# Alternative mirror
wget https://github.com/facebookresearch/demucs/releases/download/v2.0.0/demucs.onnx
```

**Option 2: Manual Download**
1. Visit: https://huggingface.co/keremberke/demucs-android
2. Download `demucs_quantized.onnx`
3. Place it in: `app/src/main/assets/demucs_quantized.onnx`

### Verify Installation

After downloading, verify the file exists:
```bash
ls -lh app/src/main/assets/demucs_quantized.onnx
```

Expected size: ~150-200MB

### What This Model Does

The Demucs ONNX model performs AI-powered stem separation:
- **Input:** Full song with vocals + instruments
- **Output:** Isolated instrumental track (vocals removed)
- **Technology:** Deep learning audio separation
- **Processing Time:** 2-5 minutes on mobile devices

### Next Steps

1. ✅ Download the model file
2. ✅ Place in `app/src/main/assets/`
3. ✅ Build the APK
4. ✅ Install on your Huawei P50 Pro

---

**Note:** Without this model file, the app will not be able to separate vocals from music.
