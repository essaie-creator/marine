<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# 🎵 Inspiration Extractor - Zero Copyright Friction

**Transform any YouTube track into a copyright-safe, AI-ready instrumental in under 10 minutes.**

Convert streaming links and audio files into copyright-neutral instrumentals with **true AI vocal removal**, stem separation, and custom DSP overlays.

---

## ⚡ Quick Start (3 Steps)

### 1. Install Dependencies
```bash
# Python backend for AI stem separation
cd backend && pip install -r requirements.txt

# Node.js frontend
cd .. && npm install
```

### 2. Run Both Services
```bash
# Terminal 1: Python backend (Port 8000)
cd backend && python main.py

# Terminal 2: React frontend (Port 3000)  
npm run dev
```

### 3. Use the App
1. Open http://localhost:3000
2. Paste a YouTube URL
3. **Toggle ON "AI Stem Separation"**
4. Click "Analyse" → Wait 2-5 min
5. Apply DSP effects → Export → Upload to Suno/Udio

📖 **Full guide:** [`QUICK_START.md`](QUICK_START.md)

---

## ✨ Key Features

### 🔐 Zero Copyright Friction
- **True AI Vocal Removal**: Demucs models isolate and remove vocals completely
- **Stem Recombination**: Mathematical mixing creates new audio fingerprint
- **LUFS Normalization**: Platform-specific loudness (-14 for Suno/Udio)
- **DSP Transformations**: Pitch, tempo, EQ changes break Content ID matching

### 🎛️ Advanced Controls
- **7 Stem Options**: Instrumental, Vocals, Drums, Bass, Guitar, Piano, Other
- **3 AI Models**: Fast (2min), High Quality (4min), 6-Stems (5min)
- **3 Export Formats**: OGG (recommended), MP3, WAV
- **4 LUFS Presets**: -14 (AI platforms), -16 (streaming), -23 (broadcast), Raw

### 📱 Frictionless UI
- **Simple Toggle**: AI Stem Separation ON/OFF
- **Collapsible Settings**: Advanced options hidden by default
- **Real-time Logs**: Watch processing progress
- **Audio Visualizer**: See your waveform transform
- **Mobile Friendly**: Copy URLs from phone, process on desktop

### 🎨 Creative DSP Suite
- **4 One-Click Presets**: Lofi Sunset, Cosmic Reverb, Nightcore, Analog Warmth
- **Manual Controls**: Vocal attenuation, reverb, vinyl crackle, delay, EQ
- **Playback Rate**: 0.8x to 1.2x for unique timing
- **Export Ready**: Download transformed instrumentals instantly

---

## 🔄 The Workflow

```
YouTube URL → AI Downloads → Vocal Removal → Stem Selection
     ↓
LUFS Normalization → Export (OGG/MP3/WAV) → DSP Effects
     ↓
Copyright-Safe Instrumental → Upload to Suno/Udio
```

**Total Time:** 8-10 minutes  
**Copyright Risk:** Near zero  
**Result:** Unique, AI-ready instrumental

---

## 🏗️ Architecture

```
/workspace/
├── src/App.tsx              # React UI with AI controls
├── server.ts                # Express + Gemini AI metadata
├── backend/main.py          # Python FastAPI stem separation
├── QUICK_START.md           # Complete workflow guide
└── README.md                # This file
```

### Two-App System:
1. **Node.js Frontend** (Port 3000): UI, metadata extraction, DSP processing
2. **Python Backend** (Port 8000): YouTube downloads, AI vocal removal, stem separation

---

## 🎯 Who Is This For?

- **Music Producers**: Extract inspiration from any track
- **AI Music Creators**: Generate copyright-safe seeds for Suno/Udio
- **Content Creators**: Make background music for videos
- **DJs & Remixers**: Isolate drums, bass, guitar for sampling
- **Anyone with a Phone**: Simple workflow, no expertise needed

---

## 📊 Performance

| Model | Time | Quality | Best For |
|-------|------|---------|----------|
| Fast | 2-3 min | Good | Quick drafts |
| High | 4-5 min | Excellent | Final releases |
| 6-Stems | 5-7 min | Ultimate | Guitar/piano isolation |

---

## 🛠️ Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Run production server
npm run lint     # Type check
```

---

## 🔧 Environment Setup

Create `.env.local`:
```env
GEMINI_API_KEY=your_api_key_here
APP_URL=http://localhost:3000
```

---

## 🐛 Troubleshooting

**"AI backend failed"** → Ensure Python is running on port 8000  
**"No stems generated"** → Try Fast model, check internet  
**CORS errors** → Run both servers simultaneously  
**Slow processing** → Use Fast model, close other apps  

See [`QUICK_START.md`](QUICK_START.md) for detailed troubleshooting.

---

## 💡 Pro Tips

1. **Maximum Safety**: Enable AI separation + High model + -14 LUFS + OGG + DSP preset
2. **Guitar Sampling**: Use 6-Stems model to isolate guitar riffs
3. **File Size**: OGG is 50% smaller than WAV with similar quality
4. **Batch Work**: Process multiple URLs sequentially
5. **Save Stems**: Export individual drums/bass for future projects

---

## 📄 License

Apache 2.0

---

**Built for creators who want frictionless, copyright-safe music production.** 🎶

Start now: `npm install && cd backend && pip install -r requirements.txt`
