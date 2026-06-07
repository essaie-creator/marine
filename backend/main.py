import os
import uuid
import shutil
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import yt_dlp
from audio_separator.separator import Separator

app = FastAPI()

# Allow your React frontend (localhost:3000) to talk to this Python backend (localhost:8000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_headers=["*"],
)

DOWNLOAD_DIR = "./downloads"
OUTPUT_DIR = "./outputs"
os.makedirs(DOWNLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

@app.post("/api/process-url")
async def process_url(payload: dict):
    url = payload.get("url")
    if not url:
        raise HTTPException(status_code=400, detail="URL is required")

    job_id = str(uuid.uuid4())
    download_path = os.path.join(DOWNLOAD_DIR, f"{job_id}.%(ext)s")
    
    # 1. Download the audio using yt-dlp (Handles YouTube perfectly)
    ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': download_path,
        'quiet': True,
        'no_warnings': True,
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            ext = info.get('ext', 'mp3')
            downloaded_file = os.path.join(DOWNLOAD_DIR, f"{job_id}.{ext}")
            
            # Fallback if yt-dlp changes the extension
            if not os.path.exists(downloaded_file):
                for f in os.listdir(DOWNLOAD_DIR):
                    if f.startswith(job_id):
                        downloaded_file = os.path.join(DOWNLOAD_DIR, f)
                        break
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Download failed: {str(e)}")

    # 2. Separate stems using AI (Demucs)
    try:
        separator = Separator(
            model_file_dir=DOWNLOAD_DIR, # Cache AI models here
            output_dir=OUTPUT_DIR,
            output_format="WAV",
            output_single_stem="INSTRUMENTAL", # Tells AI to only render the instrumental, saving 50% time!
            normalization="-14.0" # Normalize to -14 LUFS (Perfect for Suno/Udio)
        )
        # Load the Fast Twin Demucs model
        separator.load_model(model_name="htdemucs_ft") 
        
        output_files = separator.separate(downloaded_file)
        
        if not output_files:
            raise Exception("AI failed to generate output files.")
            
        instrumental_path = output_files[0] 
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Stem separation failed: {str(e)}")
    finally:
        # Clean up the original downloaded file to save disk space
        if os.path.exists(downloaded_file):
            os.remove(downloaded_file)

    # 3. Return the clean instrumental file info to the frontend
    final_filename = f"{job_id}_instrumental.wav"
    final_path = os.path.join(OUTPUT_DIR, final_filename)
    shutil.move(instrumental_path, final_path)
    
    return {"job_id": job_id, "filename": final_filename, "message": "AI stem separation complete."}

@app.get("/api/download/{filename}")
async def download_file(filename: str):
    file_path = os.path.join(OUTPUT_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(file_path, media_type="audio/wav", filename=filename)
