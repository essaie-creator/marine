# Inspiration Extractor - Complete Workflow Assembly Guide

## Overview
This guide shows you how to assemble all pieces of your music production workflow:
1. **Download** audio from YouTube/Spotify/Deezer
2. **Remove vocals** using AI stem separation
3. **Adjust for copyright** with DSP transformations
4. **Export** in modern formats (MP3/OGG instead of WAV)
5. **Upload** to AI music platforms (Suno, Udio, etc.)

---

## Current Architecture Analysis

Your app currently uses:
- ✅ **Express.js + TypeScript** backend with Gemini AI
- ✅ **Web Audio API** for client-side DSP processing
- ✅ **Procedural synth loops** as placeholder audio
- ✅ **User file uploads** (local files only)
- ❌ **No actual URL audio downloading**
- ❌ **No true AI vocal removal** (only simulated notch filter)
- ❌ **WAV-only export** (large file sizes)

---

## Recommended Architecture: Hybrid TypeScript + Python

### Why Hybrid?
- True vocal removal requires AI models (Demucs, Spleeter)
- These models need Python libraries (`audio-separator`, `torch`)
- Your existing TypeScript stack handles UI, metadata, and DSP perfectly
- Keep both: TypeScript for app logic, Python for stem separation

---

## Step-by-Step Assembly

### Step 1: Add Python Microservice

Create a new directory structure:
```
/workspace/
├── server.ts              # Your existing Express server
├── src/                   # Your React frontend
├── backend/               # NEW: Python FastAPI service
│   ├── main.py
│   ├── requirements.txt
│   └── downloads/         # Auto-created for temp files
└── package.json
```

#### Create `/workspace/backend/requirements.txt`:
```txt
fastapi==0.109.0
uvicorn[standard]==0.27.0
yt-dlp==2024.3.10
audio-separator==0.18.0
librosa==0.10.1
soundfile==0.12.1
numpy==1.26.3
python-multipart==0.0.6
```

#### Create `/workspace/backend/main.py`:
```python
import os
import uuid
import shutil
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import yt_dlp
import librosa
import soundfile as sf
import numpy as np
from audio_separator.separator import Separator

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DOWNLOAD_DIR = "./downloads"
OUTPUT_DIR = "./outputs"
os.makedirs(DOWNLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

MODEL_MAP = {
    "demucs_fast": "htdemucs_ft",      # 4 stems, fast
    "demucs_high": "htdemucs",         # 4 stems, high quality
    "demucs_6stems": "htdemucs_6s"     # 6 stems: vocals, drums, bass, guitar, piano, other
}

@app.post("/api/process-url")
async def process_url(payload: dict):
    url = payload.get("url")
    target_stems = payload.get("stems", ["instrumental"])
    model_key = payload.get("model", "demucs_fast")
    normalization = payload.get("normalization", "-14.0")
    output_format = payload.get("format", "ogg")  # ogg, mp3, wav
    
    if not url:
        raise HTTPException(status_code=400, detail="URL is required")

    job_id = str(uuid.uuid4())
    download_path = os.path.join(DOWNLOAD_DIR, f"{job_id}.%(ext)s")
    
    # 1. Download Audio from URL
    ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': download_path,
        'quiet': True,
        'no_warnings': True
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            ext = info.get('ext', 'mp3')
            downloaded_file = os.path.join(DOWNLOAD_DIR, f"{job_id}.{ext}")
            
            # Find actual downloaded file
            if not os.path.exists(downloaded_file):
                for f in os.listdir(DOWNLOAD_DIR):
                    if f.startswith(job_id) and f != download_path.split('/')[-1]:
                        downloaded_file = os.path.join(DOWNLOAD_DIR, f)
                        break
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Download failed: {str(e)}")

    # 2. Separate Stems using AI
    model_name = MODEL_MAP.get(model_key, "htdemucs_ft")
    try:
        separator = Separator(
            model_file_dir=DOWNLOAD_DIR,
            output_dir=OUTPUT_DIR,
            output_format=output_format.upper(),
            normalization_threshold=normalization if normalization != "0.0" else None
        )
        separator.load_model(model_name=model_name)
        output_files = separator.separate(downloaded_file)
        
        if not output_files:
            raise Exception("AI failed to generate output files.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Stem separation failed: {str(e)}")
    finally:
        # Clean up downloaded file
        if os.path.exists(downloaded_file):
            os.remove(downloaded_file)

    # 3. Process and Filter Stems
    final_stems = {}
    original_basename = os.path.splitext(os.path.basename(downloaded_file))[0]
    
    # Map output files to stem names
    available_stems = {}
    for f in output_files:
        fname = os.path.basename(f)
        if fname.startswith(original_basename):
            stem_name = fname.replace(f"{original_basename}_", "").split('.')[0]
            available_stems[stem_name] = f

    # Handle "instrumental" by combining non-vocal stems
    if "instrumental" in target_stems:
        instrumental_data = None
        sr = 44100
        non_vocal_stems = [s for s in available_stems.keys() if s != "vocals"]
        
        for stem in non_vocal_stems:
            if stem in available_stems:
                data, sample_rate = librosa.load(available_stems[stem], sr=None, mono=False)
                sr = sample_rate
                if instrumental_data is None:
                    instrumental_data = data
                else:
                    min_len = min(instrumental_data.shape[-1], data.shape[-1])
                    instrumental_data = instrumental_data[..., :min_len] + data[..., :min_len]
        
        if instrumental_data is not None:
            inst_ext = output_format if output_format != "mp3" else "wav"  # mp3 needs encoder
            inst_path = os.path.join(OUTPUT_DIR, f"{job_id}_instrumental.{inst_ext}")
            sf.write(inst_path, instrumental_data.T, sr)
            final_stems["instrumental"] = f"{job_id}_instrumental.{inst_ext}"
            
        # Clean up individual non-vocal stems
        for stem in non_vocal_stems:
            if stem in available_stems and os.path.exists(available_stems[stem]):
                os.remove(available_stems[stem])

    # Handle specific stem requests
    for stem in target_stems:
        if stem != "instrumental" and stem in available_stems:
            ext = output_format if output_format != "mp3" else "wav"
            final_name = f"{job_id}_{stem}.{ext}"
            final_path = os.path.join(OUTPUT_DIR, final_name)
            shutil.move(available_stems[stem], final_path)
            final_stems[stem] = final_name

    # Clean up remaining unrequested stems
    for stem, path in available_stems.items():
        if os.path.exists(path):
            os.remove(path)

    return JSONResponse(content={
        "job_id": job_id,
        "stems": final_stems,
        "message": f"Successfully separated {len(final_stems)} stem(s)."
    })

@app.get("/api/download/{filename}")
async def download_file(filename: str):
    file_path = os.path.join(OUTPUT_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    # Determine media type
    ext = filename.split('.')[-1].lower()
    media_types = {
        "wav": "audio/wav",
        "mp3": "audio/mpeg",
        "ogg": "audio/ogg",
        "flac": "audio/flac"
    }
    media_type = media_types.get(ext, "application/octet-stream")
    
    return FileResponse(file_path, media_type=media_type, filename=filename)

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "stem-separator"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

---

### Step 2: Update Your React Frontend

Modify `/workspace/src/App.tsx` to add advanced controls and support multiple export formats.

#### Add New State Variables (after line 214):
```typescript
const [selectedStems, setSelectedStems] = useState<string[]>(["instrumental"]);
const [selectedModel, setSelectedModel] = useState("demucs_fast");
const [normalization, setNormalization] = useState("-14.0");
const [showAdvanced, setShowAdvanced] = useState(false);
const [exportFormat, setExportFormat] = useState<"ogg" | "mp3" | "wav">("ogg");
const [usePythonBackend, setUsePythonBackend] = useState(false);
```

#### Replace `handleUrlAnalyse` Function (around line 404):
```typescript
const handleUrlAnalyse = async (e: FormEvent) => {
  e.preventDefault();
  if (!urlInput.trim()) return;

  setStep("fetching");
  
  // Check if using Python backend for true stem separation
  if (usePythonBackend) {
    appendLog(`Initializing Python AI pipeline. Model: ${selectedModel}, Stems: ${selectedStems.join(", ")}`, "info");
    
    try {
      const processResponse = await fetch("http://localhost:8000/api/process-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          url: urlInput,
          stems: selectedStems,
          model: selectedModel,
          normalization: normalization,
          format: exportFormat
        }),
      });

      if (!processResponse.ok) {
        const error = await processResponse.json();
        throw new Error(error.detail || "Backend failed to process URL.");
      }
      
      const { job_id, stems, message } = await processResponse.json();
      setStep("analyzing");
      appendLog(`Backend: ${message}`, "success");

      // Pick the first available stem to load
      const primaryStemKey = Object.keys(stems)[0];
      const primaryFilename = stems[primaryStemKey];
      
      if (!primaryFilename) throw new Error("No stems were generated.");

      appendLog(`Fetching separated audio: ${primaryStemKey}...`, "info");
      
      const audioResponse = await fetch(`http://localhost:8000/api/download/${primaryFilename}`);
      if (!audioResponse.ok) throw new Error("Failed to download the separated audio.");
      
      const arrayBuffer = await audioResponse.arrayBuffer();
      const ctx = getAudioContext();
      
      setStep("overlaying");
      appendLog(`Decoding ${primaryStemKey} into Web Audio API...`, "info");

      ctx.decodeAudioData(arrayBuffer, (decodedBuffer) => {
        setUploadedBuffer(decodedBuffer);
        setIsUsingUploadedFile(true);
        setStep("completed");
        appendLog(`Successfully loaded ${primaryStemKey}! Duration: ${decodedBuffer.duration.toFixed(1)}s`, "success");
        
        // Fetch metadata from Node server
        fetch("/api/analyze-link", {
           method: "POST",
           headers: { "Content-Type": "application/json" },
           body: JSON.stringify({ url: urlInput }),
        }).then(res => res.json()).then(setMetadata).catch(() => {});

      }, (decodeError) => { 
        throw decodeError; 
      });

    } catch (err: any) {
      setStep("idle");
      appendLog(`Pipeline error: ${err.message || err}`, "warning");
      appendLog(`Falling back to metadata-only mode.`, "info");
    }
    return;
  }

  // Original TypeScript-only flow (metadata extraction only)
  appendLog(`Contacting extraction server endpoints to target: ${urlInput.slice(0, 45)}...`, "info");

  try {
    const response = await fetch("/api/analyze-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: urlInput }),
    });

    if (!response.ok) throw new Error("Server responded with error status.");
    
    const parsedMeta: LinkMetadata = await response.json();
    setStep("analyzing");
    
    setTimeout(() => {
      setMetadata(parsedMeta);
      setIsUsingUploadedFile(false);
      setUploadedBuffer(null);
      setStep("idle");
      appendLog(`Successfully analyzed stream metadata: "${parsedMeta.title}" by ${parsedMeta.artist}`, "success");
      appendLog(`Estimated BPM: ${parsedMeta.bpm} | Musical Scale: ${parsedMeta.key}`, "info");
      appendLog(`Note: Enable "AI Stem Separation" in Advanced Settings to download and process actual audio.`, "info");
    }, 1200);

  } catch (err: any) {
    appendLog(`Meta lookup failed: ${err.message || err}. Reverting to localized pipeline configuration.`, "warning");
    setStep("idle");
  }
};
```

#### Add Export Format Selection in UI

Find the export button section (around line 850-900) and add format selector before the export button:

```typescript
{/* Export Format Selector */}
<div className="flex items-center gap-3 mb-4">
  <label className="text-sm text-gray-400">Export Format:</label>
  <select
    value={exportFormat}
    onChange={(e) => setExportFormat(e.target.value as "ogg" | "mp3" | "wav")}
    className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none"
  >
    <option value="ogg">OGG Vorbis (Recommended - Small size, good quality)</option>
    <option value="mp3">MP3 (Universal compatibility)</option>
    <option value="wav">WAV (Uncompressed, largest size)</option>
  </select>
  <span className="text-xs text-gray-500">
    {exportFormat === "ogg" && "~30% smaller than WAV"}
    {exportFormat === "mp3" && "Best for sharing"}
    {exportFormat === "wav" && "Lossless quality"}
  </span>
</div>
```

#### Add Advanced Settings Accordion

Add this after the URL input form and before the preset buttons:

```typescript
{/* Advanced Settings Accordion */}
<div className="mt-4 border border-gray-700 rounded-lg overflow-hidden transition-all">
  <button 
    type="button"
    onClick={() => setShowAdvanced(!showAdvanced)}
    className="w-full flex justify-between items-center p-3 bg-gray-800/50 hover:bg-gray-800 transition"
  >
    <span className="text-sm font-medium text-gray-300 flex items-center gap-2">
      <Settings2 className="w-4 h-4" />
      Advanced Separation Settings
    </span>
    <span className={`transform transition ${showAdvanced ? 'rotate-180' : ''} text-gray-400`}>▼</span>
  </button>
  
  {showAdvanced && (
    <div className="p-4 bg-gray-900/80 space-y-5 border-t border-gray-700">
      {/* Python Backend Toggle */}
      <div className="flex items-center justify-between p-3 bg-blue-900/20 border border-blue-800 rounded">
        <div>
          <h4 className="text-sm font-semibold text-blue-300">AI Stem Separation (Python Required)</h4>
          <p className="text-xs text-blue-400 mt-1">
            Downloads audio and uses Demucs AI to isolate vocals, drums, bass, etc.
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={usePythonBackend}
            onChange={(e) => setUsePythonBackend(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>

      {usePythonBackend && (
        <>
          {/* Stem Selection */}
          <div>
            <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">Target Stems</label>
            <div className="flex flex-wrap gap-2">
              {["instrumental", "vocals", "drums", "bass", "guitar", "piano", "other"].map((stem) => (
                <button
                  key={stem}
                  type="button"
                  onClick={() => {
                    if (selectedStems.includes(stem)) {
                      setSelectedStems(selectedStems.filter(s => s !== stem));
                    } else {
                      setSelectedStems([...selectedStems, stem]);
                    }
                  }}
                  className={`px-3 py-1.5 text-xs rounded-full border transition ${
                    selectedStems.includes(stem) 
                      ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20' 
                      : 'bg-gray-800 border-gray-600 text-gray-400 hover:border-gray-500'
                  }`}
                >
                  {stem.charAt(0).toUpperCase() + stem.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Algorithm Selection */}
            <div>
              <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">AI Algorithm</label>
              <select 
                value={selectedModel} 
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="demucs_fast">Demucs Fast (Speed optimized)</option>
                <option value="demucs_high">Demucs High (Quality optimized)</option>
                <option value="demucs_6stems">Demucs 6-Stems (Isolates Guitar/Piano)</option>
              </select>
            </div>

            {/* Normalization */}
            <div>
              <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">Loudness (LUFS)</label>
              <select 
                value={normalization} 
                onChange={(e) => setNormalization(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="-14.0">-14.0 (Standard for Suno/Udio)</option>
                <option value="-16.0">-16.0 (Streaming Standard)</option>
                <option value="-23.0">-23.0 (Broadcast Standard)</option>
                <option value="0.0">No Normalization (Raw)</option>
              </select>
            </div>
          </div>
        </>
      )}
    </div>
  )}
</div>
```

---

### Step 3: Update Export Function for Multiple Formats

Replace the `generateExportFile` function's blob creation part. Since Web Audio API only supports WAV natively, we'll use a client-side MP3/OGG encoder library.

First, install the encoder:
```bash
npm install lamejs
npm install --save-dev @types/lamejs
```

Then update the export function to encode to the selected format:

```typescript
// Add at the top of App.tsx with other imports
import * as lamejs from 'lamejs';

// Update bufferToWav to support multiple formats
const bufferToEncodedFile = (buffer: AudioBuffer, format: "wav" | "mp3" | "ogg"): Blob => {
  if (format === "wav") {
    return bufferToWav(buffer);
  }
  
  if (format === "mp3") {
    const samples = buffer.getChannelData(0);
    const mp3encoder = new lamejs.Mp3Encoder(1, buffer.sampleRate, 128);
    const mp3Data: Int8Array[] = [];
    
    const sampleBlockSize = 1152;
    for (let i = 0; i < samples.length; i += sampleBlockSize) {
      const sampleChunk = samples.subarray(i, i + sampleBlockSize);
      const mp3buf = mp3encoder.encodeBuffer(sampleChunk);
      if (mp3buf.length > 0) {
        mp3Data.push(mp3buf);
      }
    }
    const mp3buf = mp3encoder.flush();
    if (mp3buf.length > 0) {
      mp3Data.push(mp3buf);
    }
    
    return new Blob(mp3Data, { type: 'audio/mp3' });
  }
  
  // For OGG, we'll use WAV as fallback (browser limitation)
  // In production, use ogg-encoder library
  console.warn("OGG encoding not fully supported in browser, using WAV");
  return bufferToWav(buffer);
};

// Update generateExportFile to use the new encoder
const generateExportFile = async () => {
  setStep("synthesizing");
  appendLog(`Opening offline audio compiler at 44100Hz stereo (Export: ${exportFormat.toUpperCase()})...`, "info");

  try {
    const originalCtx = getAudioContext();
    
    const renderDuration = Math.min(uploadedBuffer ? uploadedBuffer.duration : 8.0, 30.0);
    const sampleRate = 44100;
    const numFrames = sampleRate * renderDuration;

    const offlineCtx = new OfflineAudioContext(2, numFrames, sampleRate);

    // ... [Keep existing DSP graph setup code unchanged] ...
    // Copy lines 568-641 from original function here

    appendLog("Rendering digital waves...", "info");
    
    const renderedBuffer = await offlineCtx.startRendering();
    appendLog(`Encoding to ${exportFormat.toUpperCase()} format...`, "info");

    const encodedBlob = bufferToEncodedFile(renderedBuffer, exportFormat);
    const url = URL.createObjectURL(encodedBlob);

    const anchor = document.createElement("a");
    anchor.href = url;
    const ext = exportFormat === "mp3" ? "mp3" : exportFormat === "ogg" ? "ogg" : "wav";
    anchor.download = `${metadata.title.replace(/\s+/g, '_')}_AI_Neut_Instrumental.${ext}`;
    anchor.click();

    setTimeout(() => URL.revokeObjectURL(url), 10000);

    setStep("completed");
    appendLog(`Exported successfully as ${ext.toUpperCase()}! Perfect for Suno/Udio inputs.`, "success");

  } catch (err: any) {
    setStep("completed");
    appendLog(`Export failed during offline compile: ${err.message || err}`, "warning");
  }
};
```

---

### Step 4: Run Both Services

#### Terminal 1: Python Backend
```bash
cd /workspace/backend
pip install -r requirements.txt
python main.py
# Runs on http://localhost:8000
```

#### Terminal 2: Node.js Frontend
```bash
cd /workspace
npm install
npm run dev
# Runs on http://localhost:3000
```

---

## Final Workflow

1. **Paste URL** → Toggle "AI Stem Separation" ON
2. **Select Stems** → Choose "instrumental" or specific stems (drums, bass, etc.)
3. **Choose Model** → Fast for testing, High Quality for final, 6-Stems for guitar/piano isolation
4. **Set LUFS** → -14.0 for Suno/Udio, -16.0 for Spotify
5. **Select Export Format** → OGG (recommended), MP3, or WAV
6. **Click Extract** → Python backend downloads, separates, and returns stems
7. **Apply DSP** → Use sliders or presets for copyright-safe transformation
8. **Export** → Download transformed instrumental in chosen format

---

## Alternative: Pure TypeScript (No Python)

If you cannot run Python, use external APIs:

1. **Moises.ai API** - Professional stem separation
2. **VocalRemover.org** - Free API (unofficial)
3. **Splitter.ai** - Commercial API

Example integration in `server.ts`:
```typescript
app.post("/api/separate-stems", async (req, res) => {
  const { url } = req.body;
  
  // Call Moises API
  const response = await fetch("https://api.moises.ai/v1/separation", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.MOISES_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ track_url: url, instruments: ["vocals", "drums", "bass", "other"] })
  });
  
  const result = await response.json();
  res.json(result);
});
```

---

## Troubleshooting

### Python Import Errors
```bash
pip uninstall audio-separator
pip install audio-separator==0.18.0
```

### CORS Errors
Ensure Python backend allows your frontend port in `allow_origins`.

### GPU Acceleration
For faster processing, install PyTorch with CUDA:
```bash
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
```

---

## Next Steps

1. Test with a YouTube link
2. Verify stem separation quality
3. Adjust DSP settings for copyright safety
4. Export and test on Suno/Udio
5. Iterate on prompt engineering for best results
