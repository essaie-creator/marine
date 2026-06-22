# Mozenrath Android - Mobile Version

This is a mobile-friendly version of the Inspiration Extractor designed to run on Android devices like the Huawei P50 Pro.

## How It Works

Instead of running heavy AI processing on your phone, this app:
1. **Bundles a lightweight server** that runs locally on your phone
2. **Provides a native Android interface** instead of a web browser
3. **Optimizes processing** for mobile hardware (uses CPU-only models)

## Features

- Download audio from YouTube/Spotify links
- AI stem separation (vocal removal) optimized for mobile
- Real-time DSP effects (reverb, EQ, vinyl crackle)
- Export processed instrumentals
- No internet required after initial setup (except for downloading songs)

## Requirements

- Android 8.0 or higher
- At least 4GB RAM recommended
- 2GB free storage space
- Termux (optional, for advanced users)

## Installation Options

### Option 1: Pre-built APK (Easiest)
Download the APK file and install directly on your phone.

### Option 2: Build from Source
Requires Android Studio and JDK 17.

## Quick Start

1. Install the app
2. Grant storage permissions
3. Paste a music URL
4. Tap "Process"
5. Wait for AI separation (2-5 minutes depending on song length)
6. Apply effects and export

## Technical Notes

- Uses ONNX Runtime for mobile AI inference
- Demucs model quantized for mobile (reduced size ~150MB)
- Processes audio in chunks to prevent memory overflow
- Battery-intensive operation - keep phone plugged in during processing
