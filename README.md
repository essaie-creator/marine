<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Inspiration Extractor & AI Pipeline

Convert streaming links and audio files into copyright-neutral, AI-ready instrumentals with custom prompt overlays and local offline DSP processing.

View your app in AI Studio: https://ai.studio/apps/83d7a8fb-b31d-4024-8255-0c192b39277c

---

## Quick Start

### Option 1: Basic Mode (TypeScript Only)
Perfect for metadata extraction and client-side DSP processing with uploaded files.

1. Install dependencies:
   ```bash
   npm install
   ```
2. Set the `GEMINI_API_KEY` in `.env.local` to your Gemini API key
3. Run the app:
   ```bash
   npm run dev
   ```
4. Open http://localhost:3000

**Features:**
- ✅ Extract metadata from URLs (YouTube, Spotify, Deezer)
- ✅ Upload local audio files
- ✅ Apply DSP effects (reverb, EQ, vinyl crackle, delay)
- ✅ Export as WAV
- ❌ No actual URL downloading
- ❌ Simulated vocal removal only (notch filter)

### Option 2: Full Mode (with Python Stem Separation)
Unlocks true AI-powered vocal removal and stem separation.

**Prerequisites:** Python 3.9+, pip

1. Install Node.js dependencies:
   ```bash
   npm install
   ```

2. Install Python dependencies:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

3. Start the Python backend (Terminal 1):
   ```bash
   cd backend
   python main.py
   # Runs on http://localhost:8000
   ```

4. Start the Node.js frontend (Terminal 2):
   ```bash
   npm run dev
   # Runs on http://localhost:3000
   ```

5. In the UI, toggle **"AI Stem Separation"** in Advanced Settings

**Features:**
- ✅ Download audio from URLs (YouTube, Spotify, Deezer)
- ✅ True AI vocal removal using Demucs
- ✅ Isolate specific stems (drums, bass, guitar, piano)
- ✅ Export as OGG, MP3, or WAV
- ✅ LUFS normalization for streaming platforms
- ✅ Copyright-safe transformations

---

## Project Structure

```
/workspace/
├── server.ts              # Express backend with Gemini AI
├── src/                   # React frontend
│   ├── App.tsx            # Main application component
│   ├── components/        # Reusable UI components
│   └── types.ts           # TypeScript interfaces
├── backend/               # Python FastAPI service (optional)
│   ├── main.py            # Stem separation API
│   ├── requirements.txt   # Python dependencies
│   ├── downloads/         # Temporary download storage
│   └── outputs/           # Processed stem output
├── package.json
├── WORKFLOW_GUIDE.md      # Detailed workflow documentation
└── README.md              # This file
```

---

## Workflow

1. **Paste a URL** → Extracts metadata using Gemini AI
2. **(Optional) Enable AI Stem Separation** → Downloads and separates audio
3. **Select stems** → Choose instrumental, vocals, drums, bass, etc.
4. **Apply DSP preset or custom settings** → Transform for copyright safety
5. **Export** → Download in OGG, MP3, or WAV format
6. **Upload to Suno/Udio** → Use as inspiration seed

---

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Run production server
- `npm run lint` - Type check

---

## Environment Variables

Create a `.env.local` file:

```env
GEMINI_API_KEY=your_api_key_here
APP_URL=http://localhost:3000
```

---

## Troubleshooting

### Python Import Errors
```bash
cd backend
pip uninstall audio-separator librosa soundfile
pip install -r requirements.txt --force-reinstall
```

### CORS Errors
Ensure both servers are running:
- Python backend on port 8000
- Node.js frontend on port 3000

### GPU Acceleration (Optional)
For faster stem separation:
```bash
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
```

---

## License

Apache 2.0
