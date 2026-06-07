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
