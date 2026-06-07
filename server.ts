import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for parsing JSON
  app.use(express.json());

  // Lazy initialize Gemini client
  let ai: GoogleGenAI | null = null;
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
      console.log("Server: Gemini client successfully initialized.");
    } catch (e) {
      console.error("Server: Failed to construct Gemini client:", e);
    }
  } else {
    console.warn("Server: GEMINI_API_KEY environment variable is not defined. Using simulation fallback mode.");
  }

  // --- API Routes ---

  // Analyze URL and extract metadata
  app.post("/api/analyze-link", async (req, res) => {
    const { url } = req.body;
    if (!url || typeof url !== "string") {
       res.status(400).json({ error: "Invalid URL provided." });
       return;
    }

    console.log(`Server: Request to analyze URL: ${url}`);

    // Detect platform
    let platform: 'youtube' | 'spotify' | 'deezer' | 'other' = 'other';
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      platform = 'youtube';
    } else if (url.includes("spotify.com")) {
      platform = 'spotify';
    } else if (url.includes("deezer.com")) {
      platform = 'deezer';
    }

    // Default metadata in case of fallback or failure
    const fallbackMetadata = {
      title: "Melodic Echoes of Midnight",
      artist: "Subterranean Collective",
      platform,
      duration: "3:42",
      bpm: 118,
      key: "G Minor",
      genre: "Electronic / Cinematic Wave",
      coverUrl: "https://images.unsplash.com/photo-1614680376593-902f74fa0d41?w=400&auto=format&fit=crop&q=80"
    };

    if (!ai) {
      console.log("Server: No Gemini key, returning fallback metadata.");
       res.json(fallbackMetadata);
       return;
    }

    try {
      const prompt = `You are a professional music archive searcher and metadata extractor. 
A user has pasted this link for music production inspiration: "${url}".
If you recognize this URL as a specific, well-known song from YouTube, Spotify, or Deezer, extract its actual:
- Song Title
- Artist name
- BPM (estimate if not sure, e.g. 120)
- Musical Key (e.g., C Major, A Minor)
- Genre (e.g., Lo-Fi Hip Hop, Synthwave, Dubstep, Indie Rock)

If the URL is a search query, a playlist, random, or unrecognizable, creatively generate an incredibly stylish, authentic-sounding cinematic or underground track profile that matches the words/slugs present in the URL. Give it great names and make it sound production-ready!
Return the data in standard JSON conforming exactly to this structure.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "The song/track title." },
              artist: { type: Type.STRING, description: "The artist or musician name." },
              duration: { type: Type.STRING, description: "Format M:SS, e.g., 3:15 or 4:02. Ensure it feels realistic." },
              bpm: { type: Type.INTEGER, description: "Realistic BPM integer, usually between 70 and 170." },
              key: { type: Type.STRING, description: "Musical key with scale, e.g., 'F# Minor' or 'C Major'." },
              genre: { type: Type.STRING, description: "Descriptive electronic or acoustic music genre." },
              coverUrl: { type: Type.STRING, description: "Unsplash premium placeholder image URL related to the aesthetic of the genre." }
            },
            required: ["title", "artist", "duration", "bpm", "key", "genre", "coverUrl"]
          }
        }
      });

      const text = response.text;
      if (text) {
        const metadata = JSON.parse(text);
        // Inject the actual detected platform
        metadata.platform = platform;
        // fallback cover images based on genre descriptors if not present
        if (!metadata.coverUrl || !metadata.coverUrl.startsWith("http")) {
          metadata.coverUrl = "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&auto=format&fit=crop&q=80";
        }
         res.json(metadata);
         return;
      }
    } catch (err) {
      console.error("Server: Gemini meta extraction failed:", err);
    }

     res.json(fallbackMetadata);
  });

  // Process text prompt into DSP parameters
  app.post("/api/process-prompt", async (req, res) => {
    const { prompt, songMetadata } = req.body;
    
    console.log(`Server: Processing sonic prompt input: "${prompt}"`);

    const defaultDsp: any = {
      vocalAttenuation: 0.85,
      reverbWet: 0.4,
      vinylVolume: 0.15,
      tapeFluter: 0.2,
      bassGain: 2.5,
      trebleGain: -1.5,
      playbackRate: 1.0,
      delayFeedback: 0.3,
      lowpassFreq: 20000,
      synthDroneVolume: 0.1,
      vibeDescription: "Clean, high-fidelity isolated instrumental stem tailored for neutral AI pipeline integration."
    };

    if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
       res.json(defaultDsp);
       return;
    }

    if (!ai) {
      console.log("Server: No Gemini key, creating clever simulated DSP config based on keyword rules.");
      
      const lower = prompt.toLowerCase();
      const mockDsp = { ...defaultDsp };
      
      if (lower.includes("lofi") || lower.includes("lo-fi") || lower.includes("chill")) {
        mockDsp.vinylVolume = 0.45;
        mockDsp.lowpassFreq = 2200;
        mockDsp.reverbWet = 0.55;
        mockDsp.tapeFluter = 0.5;
        mockDsp.bassGain = 4.0;
        mockDsp.trebleGain = -4.0;
        mockDsp.vibeDescription = "Simulating warm, dusty lo-fi cassette tape processing with a tight lowpass filter."
      } else if (lower.includes("ambient") || lower.includes("drone") || lower.includes("reverb") || lower.includes("space")) {
        mockDsp.reverbWet = 0.85;
        mockDsp.synthDroneVolume = 0.6;
        mockDsp.delayFeedback = 0.6;
        mockDsp.lowpassFreq = 8000;
        mockDsp.vibeDescription = "Simulating rich cosmic ambient reverb textures with deep sub-synth shadows."
      } else if (lower.includes("sped up") || lower.includes("fast") || lower.includes("nightcore")) {
        mockDsp.playbackRate = 1.15;
        mockDsp.trebleGain = 3.0;
        mockDsp.vibeDescription = "Speeding up tempo to 1.15x for a modern copyright-evading nightcore bounce."
      } else if (lower.includes("vaporwave") || lower.includes("slowed") || lower.includes("reverb")) {
        mockDsp.playbackRate = 0.88;
        mockDsp.vinylVolume = 0.3;
        mockDsp.reverbWet = 0.6;
        mockDsp.vibeDescription = "Slowed down to 0.88x with heavy vapor reverberation."
      } else {
        mockDsp.vibeDescription = `Applied overlay parameters fine-tuned for: "${prompt}"`;
      }
       res.json(mockDsp);
       return;
    }

    try {
      const gPrompt = `You are a Senior Digital Signal Processing (DSP) Audio Engineer.
We have an instrumental music track. The user wants to overlay a textual prompt to mutate, deform, or enhance the audio texture before exporting it to Suno or other music platforms so it is copyright-neutral (i.e. has unique sonic characteristics, added textures, or altered speed so standard scrapers and fingerprints cannot identify it).

The track metadata is: ${JSON.stringify(songMetadata || {})}
The user's prompt is: "${prompt}"

Generate the perfect DSP configuration to apply this style. Make the choices extremely authentic, musical, and high-quality! Give us precise values.
Return the variables in JSON format according to this exact structural definition. Keep parameters technically consistent!`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: gPrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              vocalAttenuation: { type: Type.NUMBER, description: "Intensity of vocal vocal removal filter. 0 means keep vocals, 1 means absolute removal. Default 0.8." },
              reverbWet: { type: Type.NUMBER, description: "Amount of ambient space. 0 to 1." },
              vinylVolume: { type: Type.NUMBER, description: "Volume of vinyl crackle noise. 0 to 1. Raise if user prompts for vinyl, lofi, vintage, retro, old, crackled, record, dust, crackle." },
              tapeFluter: { type: Type.NUMBER, description: "Tape pitch flutter rate (analog detuning). 0 to 1. Higher is more wobbly/warped tape sound." },
              bassGain: { type: Type.NUMBER, description: "EQ Bass gain in dB. Range -10 to +10 dB." },
              trebleGain: { type: Type.NUMBER, description: "EQ Treble gain in dB. Range -10 to +10 dB." },
              playbackRate: { type: Type.NUMBER, description: "Playback speed/transposition factor to bypass robotic audio match. Typically 0.90 to 1.15. Default is 1.0 (no pitch change) unless user wants slowed-down, vaporwave, fast, sped up, nightcore." },
              delayFeedback: { type: Type.NUMBER, description: "Echo delay feedback level. 0 to 0.8." },
              lowpassFreq: { type: Type.NUMBER, description: "Lowpass filter cutoff frequency. Range 200 Hz to 20000 Hz. Default is 20000 Hz (fully open) unless the user asks for lowpass, muffled, filter sweeps, underwater, lofi, dark sound." },
              synthDroneVolume: { type: Type.NUMBER, description: "Volume of a sub-bass drone oscillator. Range 0 to 1. Elevates depth if ambient, drone, deep, cinematic is requested." },
              vibeDescription: { type: Type.STRING, description: "A highly creative 1-sentence description of the sonic textures being applied based on their prompt." }
            },
            required: [
              "vocalAttenuation",
              "reverbWet",
              "vinylVolume",
              "tapeFluter",
              "bassGain",
              "trebleGain",
              "playbackRate",
              "delayFeedback",
              "lowpassFreq",
              "synthDroneVolume",
              "vibeDescription"
            ]
          }
        }
      });

      const text = response.text;
      if (text) {
        const dspConfig = JSON.parse(text);
         res.json(dspConfig);
         return;
      }
    } catch (err) {
      console.error("Server: Gemini DSP mapping failed, using rule-based fallback:", err);
    }

     res.json(defaultDsp);
  });

  // --- Vite & Production Static Handling ---

  if (process.env.NODE_ENV !== "production") {
    console.log("Server: Running in development mode with Vite middleware.");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Server: Running in production mode serving built static files.");
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
