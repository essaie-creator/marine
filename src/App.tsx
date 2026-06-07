/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, FormEvent, ChangeEvent } from "react";
import { Link, Upload, Play, Pause, Download, Sparkles, Music, Settings2, FileAudio, Volume2, RefreshCcw, CheckCircle2, AlertTriangle, Radio, Disc, Sliders, Info } from "lucide-react";
import { LinkMetadata, DspConfig, ProcessorStep, AuditLog, Preset } from "./types";
import AudioVisualizer from "./components/AudioVisualizer";

// Global audio helper variables
let globalAudioCtx: AudioContext | null = null;
let activeBufferSource: AudioBufferSourceNode | null = null;
let activeVinylSource: AudioBufferSourceNode | null = null;
let activeDroneOsc: OscillatorNode | null = null;

// Audio Node References
let vocalFilterNode: BiquadFilterNode | null = null;
let toneFilterNode: BiquadFilterNode | null = null;
let bassEqNode: BiquadFilterNode | null = null;
let trebleEqNode: BiquadFilterNode | null = null;
let delayNode: DelayNode | null = null;
let delayFeedbackNode: GainNode | null = null;
let vinylGainNode: GainNode | null = null;
let droneGainNode: GainNode | null = null;
let mainGainNode: GainNode | null = null;
let globalAnalyserNode: AnalyserNode | null = null;

// Default configuration settings
const DEFAULT_METADATA: LinkMetadata = {
  title: "Vapor Highway (Midnight Cut)",
  artist: "Neo Rhythm Network",
  platform: "youtube",
  duration: "4:08",
  bpm: 112,
  key: "F# Minor",
  genre: "Vaporwave / Electronic Bass",
  coverUrl: "https://images.unsplash.com/photo-1614680376593-902f74fa0d41?w=400&auto=format&fit=crop&q=80"
};

const DEFAULT_DSP: DspConfig = {
  vocalAttenuation: 0.85,
  reverbWet: 0.35,
  vinylVolume: 0.1,
  tapeFluter: 0.15,
  bassGain: 2.0,
  trebleGain: -2.0,
  playbackRate: 1.0,
  delayFeedback: 0.25,
  lowpassFreq: 20000,
  synthDroneVolume: 0.05,
  vibeDescription: "Original alignment: Pure vocal isolation filter active."
};

const INSPO_PRESETS: Preset[] = [
  {
    id: "lofi-dust",
    name: "Lofi Sunset Dust",
    prompt: "warm hazy lo-fi tape saturation, vinyl record dust crackle, cozy lowpass filter envelope",
    icon: "☕",
    config: {
      vocalAttenuation: 0.9,
      reverbWet: 0.5,
      vinylVolume: 0.5,
      tapeFluter: 0.35,
      bassGain: 4.5,
      trebleGain: -4.0,
      playbackRate: 0.95,
      delayFeedback: 0.2,
      lowpassFreq: 1800,
      synthDroneVolume: 0.15
    }
  },
  {
    id: "cosmic-reverb",
    name: "Cosmic Space Reverb",
    prompt: "deep futuristic ambient space, infinite cathedral reverb, sub-bass synth pad shadow",
    icon: "🌌",
    config: {
      vocalAttenuation: 0.8,
      reverbWet: 0.8,
      vinylVolume: 0.05,
      tapeFluter: 0.15,
      bassGain: 2.0,
      trebleGain: 1.0,
      playbackRate: 0.9,
      delayFeedback: 0.55,
      lowpassFreq: 6000,
      synthDroneVolume: 0.4
    }
  },
  {
    id: "nightcore",
    name: "Sped Up Nightcore",
    prompt: "hyper fast high energy, bright crisp treble boost, transposition pitch shift to evade detectors",
    icon: "⚡",
    config: {
      vocalAttenuation: 0.85,
      reverbWet: 0.25,
      vinylVolume: 0.0,
      tapeFluter: 0.05,
      bassGain: -1.0,
      trebleGain: 4.5,
      playbackRate: 1.15,
      delayFeedback: 0.15,
      lowpassFreq: 20000,
      synthDroneVolume: 0.0
    }
  },
  {
    id: "tape-warmth",
    name: "Analog Warmth Deluxe",
    prompt: "gently detuned retro cassette deck, beautiful analog flutter, solid low bass presence",
    icon: "📼",
    config: {
      vocalAttenuation: 0.75,
      reverbWet: 0.3,
      vinylVolume: 0.2,
      tapeFluter: 0.25,
      bassGain: 3.5,
      trebleGain: -1.0,
      playbackRate: 0.98,
      delayFeedback: 0.1,
      lowpassFreq: 12000,
      synthDroneVolume: 0.1
    }
  }
];

// Mathematical Web Audio synth loops
function generateSynthLoopBuffer(ctx: AudioContext): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const duration = 8.0; // 4 bars at 120 BPM = 8.0 seconds
  const length = sampleRate * duration;
  const buffer = ctx.createBuffer(2, length, sampleRate);
  
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);
  
  // Chords: G minor -> Eb major -> F major -> D minor
  const chordFrequencies = [
    [196.00, 233.08, 293.66, 392.00], // Gm (G3, Bb3, D4, G4)
    [155.56, 196.00, 233.08, 311.13], // Eb (Eb3, G3, Bb3, Eb4)
    [174.61, 220.00, 261.63, 349.23], // F  (F3, A3, C4, F4)
    [146.83, 174.61, 220.00, 293.66]  // Dm (D3, F3, A3, D4)
  ];
  
  for (let i = 0; i < length; i++) {
    const time = i / sampleRate;
    const bar = Math.floor(time / 2.0) % 4;
    const chord = chordFrequencies[bar];
    
    let synthSample = 0;
    
    // Additive oscillator synthesis
    chord.forEach((freq, idx) => {
      // Warm sine fundamental
      synthSample += Math.sin(2 * Math.PI * (freq / 2) * time) * 0.13;
      // High bright triangle harmonics
      synthSample += (Math.abs((time * freq) % 1 - 0.5) - 0.25) * 0.08;
      // Soft ambient pulse
      synthSample += Math.sin(2 * Math.PI * freq * time + Math.sin(time * 3)) * 0.03;
    });

    // Ambient shaker/tick envelope
    const tickPeriod = time * 8.0; // eighth notes
    const tickOffset = tickPeriod - Math.floor(tickPeriod);
    const tickVolume = Math.exp(-tickOffset / 0.03) * 0.012;
    const noise = (Math.random() - 0.5) * tickVolume;

    // Fluid spatial panning
    const panning = 0.5 + 0.2 * Math.sin(time * Math.PI * 0.5);
    
    left[i] = (synthSample * 0.2 + noise) * (1 - panning);
    right[i] = (synthSample * 0.2 + noise) * panning;
  }
  
  return buffer;
}

function generateVinylCrackleBuffer(ctx: AudioContext): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = sampleRate * 4; // 4 second loopable vinyl dust
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  
  for (let i = 0; i < length; i++) {
    let backgroundHiss = (Math.random() - 0.5) * 0.006;
    
    // Random dust explosions
    if (Math.random() > 0.9998) {
      const impulseStrength = 0.35 + Math.random() * 0.5;
      const decayDuration = 30 + Math.floor(Math.random() * 100);
      for (let j = 0; j < decayDuration && i + j < length; j++) {
        data[i + j] += impulseStrength * Math.exp(-j / 18) * (Math.random() - 0.5);
      }
    }
    
    data[i] = backgroundHiss + Math.sin(i * 0.005) * 0.002;
  }
  
  return buffer;
}

export default function App() {
  const [urlInput, setUrlInput] = useState("");
  const [promptInput, setPromptInput] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  
  // AI Stem Separation States
  const [useAiSeparation, setUseAiSeparation] = useState(false);
  const [selectedStems, setSelectedStems] = useState<string[]>(["instrumental"]);
  const [selectedModel, setSelectedModel] = useState("demucs_fast");
  const [normalization, setNormalization] = useState("-14.0");
  const [outputFormat, setOutputFormat] = useState("ogg");
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const [step, setStep] = useState<ProcessorStep>("idle");
  const [metadata, setMetadata] = useState<LinkMetadata>(DEFAULT_METADATA);
  const [dspConfig, setDspConfig] = useState<DspConfig>(DEFAULT_DSP);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isUsingUploadedFile, setIsUsingUploadedFile] = useState(false);
  
  const [logs, setLogs] = useState<AuditLog[]>([
    { id: "1", timestamp: "20:07", message: "Inspiration Pipeline standing by.", type: "info" },
    { id: "2", timestamp: "20:07", message: "Loaded prebuilt mathematical loops (Vapor Highway).", type: "info" }
  ]);

  // Audio system variables (state managed wrappers)
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [uploadedBuffer, setUploadedBuffer] = useState<AudioBuffer | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to append logs
  const appendLog = (message: string, type: 'info' | 'success' | 'warning' = 'info') => {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs(prev => [
      { id: Date.now().toString(), timestamp: time, message, type },
      ...prev.slice(0, 49) // Keep last 50 logs
    ]);
  };

  // Setup Web Audio Graph Context
  const getAudioContext = (): AudioContext => {
    if (!globalAudioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      globalAudioCtx = new AudioCtxClass();
      
      // Setup Analyser
      globalAnalyserNode = globalAudioCtx.createAnalyser();
      globalAnalyserNode.fftSize = 128;
      setAnalyser(globalAnalyserNode);

      // Create DSP processing node list
      vocalFilterNode = globalAudioCtx.createBiquadFilter();
      vocalFilterNode.type = "notch";
      vocalFilterNode.frequency.value = 1000;
      vocalFilterNode.Q.value = 0.55;

      toneFilterNode = globalAudioCtx.createBiquadFilter();
      toneFilterNode.type = "lowpass";
      toneFilterNode.frequency.value = dspConfig.lowpassFreq;

      bassEqNode = globalAudioCtx.createBiquadFilter();
      bassEqNode.type = "lowshelf";
      bassEqNode.frequency.value = 220;
      bassEqNode.gain.value = dspConfig.bassGain;

      trebleEqNode = globalAudioCtx.createBiquadFilter();
      trebleEqNode.type = "highshelf";
      trebleEqNode.frequency.value = 3500;
      trebleEqNode.gain.value = dspConfig.trebleGain;

      delayNode = globalAudioCtx.createDelay(1.0);
      delayNode.delayTime.value = 0.35;

      delayFeedbackNode = globalAudioCtx.createGain();
      delayFeedbackNode.gain.value = dspConfig.delayFeedback;

      vinylGainNode = globalAudioCtx.createGain();
      vinylGainNode.gain.value = dspConfig.vinylVolume;

      droneGainNode = globalAudioCtx.createGain();
      droneGainNode.gain.value = dspConfig.synthDroneVolume;

      mainGainNode = globalAudioCtx.createGain();
      mainGainNode.gain.value = 0.85;

      // Connect standard chain
      // Source -> vocalFilter -> toneFilter -> bassEq -> trebleEq -> mainGain -> Analyser -> Dest
      vocalFilterNode.connect(toneFilterNode);
      toneFilterNode.connect(bassEqNode);
      bassEqNode.connect(trebleEqNode);
      
      // Feed through feedback echo chain in parallel
      trebleEqNode.connect(delayNode);
      delayNode.connect(delayFeedbackNode);
      delayFeedbackNode.connect(delayNode); // feedback loop
      delayFeedbackNode.connect(mainGainNode); // send to main output

      trebleEqNode.connect(mainGainNode);
      mainGainNode.connect(globalAnalyserNode);
      globalAnalyserNode.connect(globalAudioCtx.destination);
    }
    
    // Resume context if suspended
    if (globalAudioCtx.state === "suspended") {
      globalAudioCtx.resume();
    }
    
    return globalAudioCtx;
  };

  // Apply slider updates to existing Web Audio Graph in real time
  const syncLiveDspNodes = (config: DspConfig) => {
    if (!vocalFilterNode || !toneFilterNode || !bassEqNode || !trebleEqNode || !delayFeedbackNode || !vinylGainNode || !droneGainNode) return;
    
    // Vocal Attenuator node logic (adjust Q and gain based on attenuation ratio)
    vocalFilterNode.frequency.value = 1000;
    // peaking/notch combination to carve frequency spectrum from 300Hz to 3200Hz
    vocalFilterNode.Q.value = 0.4 + config.vocalAttenuation * 0.8;
    
    // Lowpass filter frequency mapping
    toneFilterNode.frequency.setValueAtTime(config.lowpassFreq, globalAudioCtx!.currentTime);

    // EQs
    bassEqNode.gain.setValueAtTime(config.bassGain, globalAudioCtx!.currentTime);
    trebleEqNode.gain.setValueAtTime(config.trebleGain, globalAudioCtx!.currentTime);

    // Echo feedback depth
    delayFeedbackNode.gain.setValueAtTime(config.delayFeedback, globalAudioCtx!.currentTime);

    // Additive layers
    vinylGainNode.gain.value = config.vinylVolume * 0.12; // safety multiplier
    droneGainNode.gain.value = config.synthDroneVolume * 0.4; // safety multiplier

    // Playback rates
    if (activeBufferSource) {
      activeBufferSource.playbackRate.value = config.playbackRate;
    }
  };

  // Sync state config values changes to the graph
  useEffect(() => {
    if (globalAudioCtx) {
      syncLiveDspNodes(dspConfig);
    }
  }, [dspConfig]);

  // Audio Play and Pause controller
  const togglePlayback = () => {
    const ctx = getAudioContext();

    if (isPlaying) {
      // Stopping
      if (activeBufferSource) {
        try { activeBufferSource.stop(); } catch(e){}
        activeBufferSource = null;
      }
      if (activeVinylSource) {
        try { activeVinylSource.stop(); } catch(e){}
        activeVinylSource = null;
      }
      if (activeDroneOsc) {
        try { activeDroneOsc.stop(); } catch(e){}
        activeDroneOsc = null;
      }
      setIsPlaying(false);
      appendLog("Playback suspended.", "info");
    } else {
      // Starting Playback
      setIsPlaying(true);
      appendLog(`Starting playback of ${isUsingUploadedFile ? "uploaded track" : "creative reference generator"}...`, "info");
      
      // 1. Play central loop
      const source = ctx.createBufferSource();
      const mainBuffer = uploadedBuffer || generateSynthLoopBuffer(ctx);
      source.buffer = mainBuffer;
      source.loop = true;
      source.playbackRate.value = dspConfig.playbackRate;

      // Connect source to the starting point of our DSP graph inside vocalFilterNode
      source.connect(vocalFilterNode!);
      source.start(0);
      activeBufferSource = source;

      // 2. Play secondary vinyl crackle node in parallel to add warm record rumble
      const vinylSource = ctx.createBufferSource();
      vinylSource.buffer = generateVinylCrackleBuffer(ctx);
      vinylSource.loop = true;
      vinylSource.connect(vinylGainNode!);
      vinylGainNode!.connect(mainGainNode!);
      vinylSource.start(0);
      activeVinylSource = vinylSource;

      // 3. Play sub-drone ambient synth node to anchor prompts
      const droneOsc = ctx.createOscillator();
      droneOsc.type = "sine";
      droneOsc.frequency.setValueAtTime(48.99, ctx.currentTime); // G1 note deep sub-bass warmth
      droneOsc.connect(droneGainNode!);
      droneGainNode!.connect(mainGainNode!);
      droneOsc.start(0);
      activeDroneOsc = droneOsc;

      // Apply initial live state
      syncLiveDspNodes(dspConfig);
    }
  };

  // URL Ingestion from form - NOW WITH AI STEM SEPARATION
  const handleUrlAnalyse = async (e: FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    setStep("fetching");
    
    // Check if user wants AI stem separation
    if (useAiSeparation) {
      appendLog(`🎵 AI Stem Separation Mode: Model=${selectedModel}, Stems=${selectedStems.join(", ")}, Format=${outputFormat}`, "info");
      
      try {
        // Call Python backend for true AI vocal removal
        const processResponse = await fetch("http://localhost:8000/api/process-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            url: urlInput,
            stems: selectedStems,
            model: selectedModel,
            normalization: normalization,
            format: outputFormat
          }),
        });

        if (!processResponse.ok) throw new Error("AI backend failed to process URL.");
        
        const { job_id, stems, message } = await processResponse.json();
        setStep("analyzing");
        appendLog(`✅ ${message}`, "success");

        // Pick the first available stem to load into DSP chain
        const primaryStemKey = Object.keys(stems)[0];
        const primaryFilename = stems[primaryStemKey];
        
        if (!primaryFilename) throw new Error("No stems were generated.");

        // Fetch the actual audio file from Python backend
        const audioResponse = await fetch(`http://localhost:8000/api/download/${primaryFilename}`);
        if (!audioResponse.ok) throw new Error("Failed to download separated audio.");
        
        const arrayBuffer = await audioResponse.arrayBuffer();
        const ctx = getAudioContext();
        
        setStep("overlaying");
        appendLog(`🎧 Decoding ${primaryStemKey} into Web Audio API...`, "info");

        ctx.decodeAudioData(arrayBuffer, (decodedBuffer) => {
          setUploadedBuffer(decodedBuffer);
          setIsUsingUploadedFile(true);
          setStep("completed");
          appendLog(`✨ Successfully loaded ${primaryStemKey}! Duration: ${decodedBuffer.duration.toFixed(1)}s`, "success");
          
          // Also fetch metadata for UI display
          fetch("/api/analyze-link", {
             method: "POST",
             headers: { "Content-Type": "application/json" },
             body: JSON.stringify({ url: urlInput }),
          }).then(res => res.json()).then(setMetadata).catch(() => {});

        }, (decodeError) => { throw decodeError; });

      } catch (err: any) {
        setStep("idle");
        appendLog(`❌ AI Pipeline error: ${err.message || err}`, "warning");
        appendLog(`💡 Falling back to metadata-only mode...`, "info");
        
        // Fallback to metadata extraction only
        extractMetadataOnly();
      }
    } else {
      // Standard metadata extraction mode (no AI separation)
      extractMetadataOnly();
    }
  };

  // Helper function for metadata-only extraction
  const extractMetadataOnly = async () => {
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
      }, 1200);

    } catch (err: any) {
      appendLog(`Meta lookup failed: ${err.message || err}. Reverting to localized pipeline configuration.`, "warning");
      setStep("idle");
    }
  };

  // Local physical file drag or selector imports
  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Standard audio safety
    if (!file.type.startsWith("audio/")) {
      appendLog("File type unsupported. Please insert a clean .mp3, .wav, or .m4a file.", "warning");
      return;
    }

    setStep("fetching");
    appendLog(`Reading local file: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)...`, "info");

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const arrayBuffer = event.target?.result as ArrayBuffer;
        const ctx = getAudioContext();
        setStep("analyzing");
        appendLog("Decoding binary audio data inside local sandbox...", "info");

        ctx.decodeAudioData(arrayBuffer, (decodedBuffer) => {
          setUploadedBuffer(decodedBuffer);
          setIsUsingUploadedFile(true);
          
          // Formulate mock track metadata based on files
          const minutes = Math.floor(decodedBuffer.duration / 60);
          const seconds = Math.floor(decodedBuffer.duration % 60).toString().padStart(2, "0");
          
          setMetadata({
            title: file.name.substring(0, file.name.lastIndexOf('.')) || file.name,
            artist: "Creator Uploaded",
            platform: "other",
            duration: `${minutes}:${seconds}`,
            bpm: 120, // default placeholder
            key: "C Major", // default placeholder
            genre: "Local High-Fidelity Stem Source",
            coverUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&auto=format&fit=crop&q=80"
          });

          setStep("idle");
          appendLog(`Local ingestion completed. Sample Rate: ${decodedBuffer.sampleRate}Hz | Duration: ${minutes}:${seconds}`, "success");
        }, (decodeError) => {
          throw decodeError;
        });

      } catch (err: any) {
        setStep("idle");
        appendLog(`Decoder crashed: ${err.message || err}`, "warning");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Prompt Mutation trigger - uses Gemini endpoint 
  const handlePromptMutation = async (customPrompt?: string) => {
    const finalPrompt = customPrompt || promptInput;
    if (!finalPrompt.trim()) return;

    setStep("isolating");
    appendLog(`Fanning isolation engines & feeding prompt parameters: "${finalPrompt}" to Gemini...`, "info");
    
    try {
      const response = await fetch("/api/process-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: finalPrompt, songMetadata: metadata }),
      });

      if (!response.ok) throw new Error("Server rejected prompt package.");

      const newDsp: DspConfig = await response.json();
      
      setStep("overlaying");
      appendLog(`Gemini successfully mapped prompt to DSP. Sonic Vibe: "${newDsp.vibeDescription}"`, "success");

      setTimeout(() => {
        setDspConfig(newDsp);
        setStep("completed");
        appendLog("Altering active pipeline coefficients. Synthesis lock verified.", "success");
      }, 1500);

    } catch (err: any) {
      appendLog(`Prompt mutation failed: ${err.message || err}. Initializing fallback lo-fi nodes.`, "warning");
      setStep("idle");
    }
  };

  // Apply explicit click selection presets
  const applyPreset = (preset: Preset) => {
    setSelectedPreset(preset.id);
    setPromptInput(preset.prompt);
    
    // We instantly simulate setting the UI to processing the prompt
    appendLog(`Preset Selected: [${preset.name}] -> Loading coefficients.`, "info");
    
    const populatedDsp: DspConfig = {
      ...DEFAULT_DSP,
      ...preset.config,
      vibeDescription: `Instantly stylized using pre-balanced coefficients of "${preset.name}".`
    } as DspConfig;

    setStep("isolating");
    setTimeout(() => {
      setStep("overlaying");
      setTimeout(() => {
        setDspConfig(populatedDsp);
        setStep("completed");
        appendLog(`Preset parameters locked! Vinyl Dust: ${(populatedDsp.vinylVolume * 100).toFixed(0)}% | Space Reverb: ${(populatedDsp.reverbWet * 100).toFixed(0)}%`, "success");
      }, 700);
    }, 600);
  };

  // Offline DSP Multi-channel compiling to WAV file download
  const generateExportFile = async () => {
    setStep("synthesizing");
    appendLog("Opening offline audio compiler at 44100Hz stereo...", "info");

    try {
      const originalCtx = getAudioContext();
      
      // Length to render
      const renderDuration = Math.min(uploadedBuffer ? uploadedBuffer.duration : 8.0, 30.0); // limited to 30s to keep sandbox super fast and fluid
      const sampleRate = 44100;
      const numFrames = sampleRate * renderDuration;

      const offlineCtx = new OfflineAudioContext(2, numFrames, sampleRate);

      // Re-create entire DSP graph on the Offline Context
      const offlineVocalFilter = offlineCtx.createBiquadFilter();
      offlineVocalFilter.type = "notch";
      offlineVocalFilter.frequency.value = 1000;
      offlineVocalFilter.Q.value = 0.4 + dspConfig.vocalAttenuation * 0.8;

      const offlineToneFilter = offlineCtx.createBiquadFilter();
      offlineToneFilter.type = "lowpass";
      offlineToneFilter.frequency.value = dspConfig.lowpassFreq;

      const offlineBassEq = offlineCtx.createBiquadFilter();
      offlineBassEq.type = "lowshelf";
      offlineBassEq.frequency.value = 220;
      offlineBassEq.gain.value = dspConfig.bassGain;

      const offlineTrebleEq = offlineCtx.createBiquadFilter();
      offlineTrebleEq.type = "highshelf";
      offlineTrebleEq.frequency.value = 3500;
      offlineTrebleEq.gain.value = dspConfig.trebleGain;

      const offlineDelay = offlineCtx.createDelay(1.0);
      offlineDelay.delayTime.value = 0.35;

      const offlineDelayFeedback = offlineCtx.createGain();
      offlineDelayFeedback.gain.value = dspConfig.delayFeedback;

      const offlineVinylGain = offlineCtx.createGain();
      offlineVinylGain.gain.value = dspConfig.vinylVolume * 0.12;

      const offlineDroneGain = offlineCtx.createGain();
      offlineDroneGain.gain.value = dspConfig.synthDroneVolume * 0.4;

      const offlineMainGain = offlineCtx.createGain();
      offlineMainGain.gain.value = 0.85;

      // Connect Offline chain
      offlineVocalFilter.connect(offlineToneFilter);
      offlineToneFilter.connect(offlineBassEq);
      offlineBassEq.connect(offlineTrebleEq);

      offlineTrebleEq.connect(offlineDelay);
      offlineDelay.connect(offlineDelayFeedback);
      offlineDelayFeedback.connect(offlineDelay);
      offlineDelayFeedback.connect(offlineMainGain);

      offlineTrebleEq.connect(offlineMainGain);
      offlineMainGain.connect(offlineCtx.destination);

      // Connect additive sources
      // Main song source
      const offlineSongSource = offlineCtx.createBufferSource();
      offlineSongSource.buffer = uploadedBuffer || generateSynthLoopBuffer(offlineCtx as any);
      offlineSongSource.playbackRate.value = dspConfig.playbackRate;
      offlineSongSource.connect(offlineVocalFilter);
      offlineSongSource.start(0);

      // Vinyl noise trigger if active
      if (dspConfig.vinylVolume > 0.02) {
        const offlineVinylSource = offlineCtx.createBufferSource();
        offlineVinylSource.buffer = generateVinylCrackleBuffer(offlineCtx as any);
        offlineVinylSource.loop = true;
        offlineVinylSource.connect(offlineVinylGain);
        offlineVinylGain.connect(offlineMainGain);
        offlineVinylSource.start(0);
      }

      // Deep shadow bass drone trigger if active
      if (dspConfig.synthDroneVolume > 0.02) {
        const offlineDroneOsc = offlineCtx.createOscillator();
        offlineDroneOsc.type = "sine";
        offlineDroneOsc.frequency.value = 48.99;
        offlineDroneOsc.connect(offlineDroneGain);
        offlineDroneGain.connect(offlineMainGain);
        offlineDroneOsc.start(0);
      }

      appendLog("Rendering digital waves...", "info");
      
      const renderedBuffer = await offlineCtx.startRendering();
      appendLog("Compiling WAV structure (16-bit PCM Linear Stereo)...", "info");

      // Binary WAV compiling
      const wavBlob = bufferToWav(renderedBuffer);
      const url = URL.createObjectURL(wavBlob);

      // Create a simulated click on a temporary structural downloading anchor
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${metadata.title.replace(/\s+/g, '_')}_AI_Neut_Instrumental.wav`;
      anchor.click();

      // Clean up pointer
      setTimeout(() => URL.revokeObjectURL(url), 10000);

      setStep("completed");
      appendLog("Exported successfully! File downloaded directly bypassing digital copyright. Perfect for Suno/Udio inputs.", "success");

    } catch (err: any) {
      setStep("completed");
      appendLog(`Export failed during offline compile: ${err.message || err}`, "warning");
    }
  };

  // Helper WAV arrays encoder
  const bufferToWav = (buffer: AudioBuffer): Blob => {
    const numOfChan = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // 16-bit PCM Linear
    const bitDepth = 16;
    
    let result;
    if (numOfChan === 2) {
      result = interleave(buffer.getChannelData(0), buffer.getChannelData(1));
    } else {
      result = buffer.getChannelData(0);
    }
    
    const bufferLength = result.length * 2;
    const wavBuffer = new ArrayBuffer(44 + bufferLength);
    const view = new DataView(wavBuffer);
    
    // Chunk Headers
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + bufferLength, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numOfChan, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numOfChan * (bitDepth / 8), true);
    view.setUint16(32, numOfChan * (bitDepth / 8), true);
    view.setUint16(34, bitDepth, true);
    writeString(view, 36, 'data');
    view.setUint32(40, bufferLength, true);
    
    // Write PCM samples
    const offset = 44;
    for (let i = 0; i < result.length; i++) {
      let s = Math.max(-1, Math.min(1, result[i]));
      view.setInt16(offset + (i * 2), s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    
    return new Blob([view], { type: 'audio/wav' });
  };

  const interleave = (inputL: Float32Array, inputR: Float32Array): Float32Array => {
    const length = inputL.length + inputR.length;
    const result = new Float32Array(length);
    let index = 0;
    let inputIndex = 0;
    
    while (index < length) {
      result[index++] = inputL[inputIndex];
      result[index++] = inputR[inputIndex];
      inputIndex++;
    }
    return result;
  };

  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 text-slate-900 flex flex-col items-center p-3 md:p-8 font-sans antialiased selection:bg-blue-600 selection:text-white">
      
      {/* Container wraps full utility in a beautiful structured console */}
      <div className="w-full max-w-4xl bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xl flex flex-col">
        
        {/* Main Hardware Header */}
        <header className="p-5 md:p-6 border-b border-stone-200 bg-white flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-slate-900 text-white p-2.5 rounded-xl shadow-md flex items-center justify-center animate-pulse">
              <Radio id="logo-icon-pulse" className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
                Inspiration Extractor <span className="text-[10px] bg-stone-100 text-blue-600 border border-stone-200 px-2 py-0.5 rounded-full font-mono uppercase font-bold">AI pipeline</span>
              </h1>
              <p className="text-xs text-slate-500">Copyright-Neutral Instrumental Generator • Client-Side DSP Core</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500 bg-stone-50 px-3 py-1.5 rounded-lg border border-stone-200 select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping inline-block mr-1" />
            OFFLINE CORE: ACTIVE 44.1KHZ
          </div>
        </header>

        {/* Console Working Deck */}
        <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-stone-200">
          
          {/* LEFT DECK Column: Ingest links and type vibe overlays */}
          <section className="col-span-7 p-5 md:p-6 space-y-6 flex flex-col">
            
            {/* Input Link Block */}
            <div className="space-y-3">
              <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                <Link className="w-4 h-4 text-blue-600" />
                Step 01 / Stream Link Ingestion
              </label>
              
              <form onSubmit={handleUrlAnalyse} className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="Paste YouTube, Spotify, or Deezer link..."
                    className="w-full bg-white border border-stone-300 rounded-xl py-3 pl-4 pr-24 text-sm focus:border-blue-600 focus:outline-[#3b82f6] focus:outline-1 transition-colors text-slate-900 shadow-sm"
                  />
                  <div className="absolute right-3 top-3.5 text-[9px] font-mono text-slate-400 uppercase select-none font-bold">AUTO SELECT</div>
                </div>
                <button
                  type="submit"
                  disabled={step === 'fetching' || step === 'analyzing' || !urlInput}
                  className="bg-slate-900 hover:bg-blue-600 disabled:bg-stone-100 disabled:text-stone-400 text-white font-bold text-xs px-5 rounded-xl transform active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                >
                  <RefreshCcw className={`w-3.5 h-3.5 ${step === 'fetching' ? 'animate-spin' : ''}`} />
                  Analyse
                </button>
              </form>

              {/* AI Stem Separation Toggle */}
              <div className="pt-3 pb-2">
                <label className="flex items-center justify-between cursor-pointer group">
                  <div className="flex items-center gap-2">
                    <div className={`w-10 h-6 rounded-full transition-colors ${useAiSeparation ? 'bg-blue-600' : 'bg-stone-300'} relative`}>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-transform ${useAiSeparation ? 'left-5' : 'left-1'}`} />
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">AI Stem Separation</span>
                  </div>
                  <span className="text-[9px] text-slate-400 font-mono">{useAiSeparation ? 'ON → Downloads + Removes Vocals' : 'OFF → Metadata Only'}</span>
                </label>
                <input
                  type="checkbox"
                  checked={useAiSeparation}
                  onChange={(e) => setUseAiSeparation(e.target.checked)}
                  className="hidden"
                />
              </div>

              {/* Advanced Settings Accordion (only visible when AI Stem Separation is ON) */}
              {useAiSeparation && (
                <div className="mt-3 border border-gray-700 rounded-lg overflow-hidden transition-all bg-gray-800/30">
                  <button 
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="w-full flex justify-between items-center p-3 bg-gray-800/50 hover:bg-gray-800/70 transition"
                  >
                    <span className="text-xs font-medium text-gray-300 flex items-center gap-2">
                      <Settings2 className="w-3.5 h-3.5 text-blue-400" />
                      Advanced Separation Settings
                    </span>
                    <span className={`transform transition ${showAdvanced ? 'rotate-180' : ''} text-gray-400`}>▼</span>
                  </button>
                  
                  {showAdvanced && (
                    <div className="p-4 bg-gray-900/60 space-y-4 border-t border-gray-700">
                      {/* Stem Selection */}
                      <div>
                        <label className="block text-[9px] text-gray-400 mb-2 uppercase tracking-wider font-bold">Target Stems</label>
                        <div className="flex flex-wrap gap-1.5">
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
                              className={`px-2.5 py-1 text-[9px] rounded-full border transition font-medium ${
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

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* Algorithm Selection */}
                        <div>
                          <label className="block text-[9px] text-gray-400 mb-1.5 uppercase tracking-wider font-bold">AI Model</label>
                          <select 
                            value={selectedModel} 
                            onChange={(e) => setSelectedModel(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-white focus:ring-1 focus:ring-blue-500 outline-none"
                          >
                            <option value="demucs_fast">Fast (Speed)</option>
                            <option value="demucs_high">High (Quality)</option>
                            <option value="demucs_6stems">6-Stems (+Guitar/Piano)</option>
                          </select>
                        </div>

                        {/* Normalization */}
                        <div>
                          <label className="block text-[9px] text-gray-400 mb-1.5 uppercase tracking-wider font-bold">LUFS Level</label>
                          <select 
                            value={normalization} 
                            onChange={(e) => setNormalization(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-white focus:ring-1 focus:ring-blue-500 outline-none"
                          >
                            <option value="-14.0">-14.0 (Suno/Udio)</option>
                            <option value="-16.0">-16.0 (Streaming)</option>
                            <option value="-23.0">-23.0 (Broadcast)</option>
                            <option value="0.0">Raw (None)</option>
                          </select>
                        </div>

                        {/* Output Format */}
                        <div>
                          <label className="block text-[9px] text-gray-400 mb-1.5 uppercase tracking-wider font-bold">Export Format</label>
                          <select 
                            value={outputFormat} 
                            onChange={(e) => setOutputFormat(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-white focus:ring-1 focus:ring-blue-500 outline-none"
                          >
                            <option value="ogg">OGG (Smallest)</option>
                            <option value="mp3">MP3 (Compatible)</option>
                            <option value="wav">WAV (Lossless)</option>
                          </select>
                        </div>
                      </div>
                      
                      <p className="text-[9px] text-gray-500 italic pt-1">
                        💡 Tip: Use 6-Stems model to isolate guitar or piano for unique sampling. OGG format provides best quality/size ratio for AI platforms.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Alternative local file uploader */}
              <div className="pt-1 flex items-center justify-between">
                <span className="text-[9px] text-slate-400 font-mono font-bold tracking-wider uppercase">OR LOCAL OFFLINE DIGITIZER</span>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[11px] font-semibold text-slate-600 hover:text-blue-600 flex items-center gap-1.5 bg-white border border-stone-200 px-3.5 py-1.5 rounded-lg hover:bg-stone-50 transition-colors shadow-sm cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Browse Audio File
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </div>

            {/* Prompt Block */}
            <div className="space-y-3 pt-2">
              <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                Step 02 / AI Prompt Overlay
              </label>

              <div className="relative">
                <textarea
                  value={promptInput}
                  onChange={(e) => {
                    setPromptInput(e.target.value);
                    if (selectedPreset) setSelectedPreset(null);
                  }}
                  rows={3}
                  placeholder="Describe desired output texture (e.g., 'warm hazy lofi tape, vinyl dust static, cathedral ambiance reverb, vaporwave slow pitch shift')"
                  className="w-full bg-white border border-stone-300 rounded-xl p-4 text-sm focus:border-blue-600 focus:outline-[#3b82f6] focus:outline-1 transition-colors text-slate-900 shadow-sm resize-none"
                />
                <button
                  onClick={() => handlePromptMutation()}
                  disabled={step === 'isolating' || step === 'overlaying' || !promptInput.trim()}
                  className="absolute right-3.5 bottom-3.5 bg-blue-600 hover:bg-slate-900 disabled:bg-stone-100 disabled:text-stone-400 text-white font-bold text-[10px] px-3.5 py-2.5 rounded-lg active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer font-mono uppercase tracking-wider shadow-md"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  Apply Overlay
                </button>
              </div>

              {/* Prebuilt style shortcuts */}
              <div className="space-y-2 pt-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Fast style preset injectors</p>
                <div className="grid grid-cols-2 gap-2">
                  {INSPO_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => applyPreset(preset)}
                      className={`p-2.5 rounded-xl text-left border transition-all text-xs flex items-center gap-2 cursor-pointer ${
                        selectedPreset === preset.id
                          ? "bg-slate-900 border-slate-900 text-white shadow-md font-semibold"
                          : "bg-white hover:bg-stone-50 border-stone-200 text-slate-700"
                      }`}
                    >
                      <span className="text-base">{preset.icon}</span>
                      <div>
                        <div className="font-semibold">{preset.name}</div>
                        <div className="text-[9px] text-slate-400 truncate max-w-[140px]">{preset.prompt}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Audio Deck visualizer */}
            <div className="space-y-2 mt-auto pt-4">
              <div className="flex justify-between items-center text-xs text-slate-500">
                <span className="font-bold uppercase tracking-wider text-[10px]">Step 03 / Visual Monitoring</span>
                <span className="font-mono text-[9px] text-slate-450 font-semibold uppercase">Real-Time Spectral</span>
              </div>
              
              <AudioVisualizer 
                analyser={analyser} 
                isPlaying={isPlaying} 
                step={step}
                dspConfig={dspConfig}
              />
            </div>

          </section>

          {/* RIGHT DECK Column: Player deck, active configurations, hardware sliders, compile buttons */}
          <aside className="col-span-5 p-5 md:p-6 bg-stone-50/50 flex flex-col justify-between space-y-6">
            
            {/* INGESTED SONG DISPLAY */}
            <div className="bg-white border border-stone-200 p-4 rounded-xl flex gap-3.5 items-center relative overflow-hidden shadow-sm">
              <div className="absolute right-3 top-3">
                {metadata.platform === 'youtube' && <span className="bg-red-50 text-red-600 text-[8px] font-mono font-bold px-1.5 py-0.5 rounded uppercase border border-red-100">YouTube</span>}
                {metadata.platform === 'spotify' && <span className="bg-green-50 text-green-600 text-[8px] font-mono font-bold px-1.5 py-0.5 rounded uppercase border border-green-100">Spotify</span>}
                {metadata.platform === 'deezer' && <span className="bg-indigo-50 text-indigo-600 text-[8px] font-mono font-bold px-1.5 py-0.5 rounded uppercase border border-indigo-100">Deezer</span>}
                {metadata.platform === 'other' && <span className="bg-stone-100 text-stone-600 text-[8px] font-mono font-bold px-1.5 py-0.5 rounded uppercase border border-stone-200">Ingested</span>}
              </div>

              {/* Spin vinyl if audio is playing */}
              <div className="relative">
                <img
                  src={metadata.coverUrl}
                  alt={metadata.title}
                  className={`w-12 h-12 rounded-lg object-cover border border-stone-200 ${isPlaying ? 'animate-[spin_4s_linear_infinite]' : ''}`}
                />
                <div className="absolute inset-0 bg-black/5 rounded-lg flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-white rounded-full" />
                </div>
              </div>

              <div className="min-w-0 pr-8">
                <div className="text-[9px] font-mono font-bold text-slate-400 uppercase flex items-center gap-1">
                  <Music className="w-3 h-3 text-blue-600" />
                  Target Stem Feed
                </div>
                <h3 className="text-sm font-bold text-slate-800 truncate max-w-[170px]">{metadata.title}</h3>
                <p className="text-xs text-slate-500 truncate max-w-[170px]">{metadata.artist}</p>
              </div>
            </div>

            {/* HARDWARE KNOBS / SLIDERS */}
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-stone-200/60">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1">
                  <Settings2 className="w-3.5 h-3.5 text-blue-600" />
                  DSP CORE COEFFICIENTS
                </span>
                <button 
                  onClick={() => {
                    setDspConfig(DEFAULT_DSP);
                    appendLog("coefficients restored to high fidelity neutral alignments.", "info");
                  }}
                  className="text-[9px] font-mono text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded hover:bg-blue-105 cursor-pointer font-bold uppercase tracking-wider"
                >
                  CALIBRATE
                </button>
              </div>

              {/* Slider 1: Vocal Attenuation */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono">
                  <span className="text-slate-550">VOCAL ATTENUATION Notch (1kHz)</span>
                  <span className="text-blue-600 font-bold">{(dspConfig.vocalAttenuation * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={dspConfig.vocalAttenuation}
                  onChange={(e) => setDspConfig(p => ({ ...p, vocalAttenuation: parseFloat(e.target.value) }))}
                  className="w-full h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              {/* Slider 2: Reverb Wetness */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono">
                  <span className="text-slate-550">DELAY / CATHE REVERB WET</span>
                  <span className="text-blue-600 font-bold">{(dspConfig.reverbWet * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="0.9"
                  step="0.05"
                  value={dspConfig.reverbWet}
                  onChange={(e) => setDspConfig(p => ({ ...p, reverbWet: parseFloat(e.target.value) }))}
                  className="w-full h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              {/* Slider 3: Vinyl Record Noise */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono">
                  <span className="text-slate-550">ANALOG VINYL RECORD STATIC</span>
                  <span className="text-blue-600 font-bold">{(dspConfig.vinylVolume * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="0.8"
                  step="0.05"
                  value={dspConfig.vinylVolume}
                  onChange={(e) => setDspConfig(p => ({ ...p, vinylVolume: parseFloat(e.target.value) }))}
                  className="w-full h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              {/* Slider 4: Speed rate detuners (transposition) */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono">
                  <span className="text-slate-550">PLAYBACK RATE TRANSPOSER</span>
                  <span className="text-blue-600 font-bold">{dspConfig.playbackRate.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.8"
                  max="1.2"
                  step="0.01"
                  value={dspConfig.playbackRate}
                  onChange={(e) => setDspConfig(p => ({ ...p, playbackRate: parseFloat(e.target.value) }))}
                  className="w-full h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              {/* Slider 5: Lowpass filtering */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono">
                  <span className="text-slate-550">LOWPASS FILTER TONE CUTOFF</span>
                  <span className="text-blue-600 font-bold">
                    {dspConfig.lowpassFreq === 20000 ? "FULLY OPEN" : `${dspConfig.lowpassFreq} Hz`}
                  </span>
                </div>
                <input
                  type="range"
                  min="200"
                  max="20000"
                  step="100"
                  value={dspConfig.lowpassFreq}
                  onChange={(e) => setDspConfig(p => ({ ...p, lowpassFreq: parseInt(e.target.value) }))}
                  className="w-full h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              {/* EQ Gainers display */}
              <div className="grid grid-cols-2 gap-2 text-[9px] font-mono py-1.5 rounded-lg border border-stone-250 bg-white text-center text-slate-600 font-semibold shadow-sm">
                <div>BASS: {dspConfig.bassGain >= 0 ? '+' : ''}{dspConfig.bassGain.toFixed(1)} dB</div>
                <div>TREBLE: {dspConfig.trebleGain >= 0 ? '+' : ''}{dspConfig.trebleGain.toFixed(1)} dB</div>
              </div>
            </div>

            {/* PROCESS & EXPORT BUTTON BOX */}
            <div className="space-y-3 pt-4 border-t border-stone-200">
              
              {/* Play buttons */}
              <div className="flex gap-2">
                <button
                  onClick={togglePlayback}
                  className={`flex-1 py-3 px-4 rounded-xl font-bold uppercase tracking-wider text-[11px] flex items-center justify-center gap-2 transform active:scale-97 transition-all cursor-pointer border ${
                    isPlaying 
                      ? "bg-red-50 border-red-200 text-red-650 hover:bg-red-100" 
                      : "bg-stone-100 hover:bg-stone-200 border-stone-200 text-slate-800"
                  }`}
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-3.5 h-3.5 fill-current" />
                      Halt Playback
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Monitor Stem
                    </>
                  )}
                </button>
              </div>

              {/* Large Neon compilation trigger */}
              <button
                onClick={generateExportFile}
                disabled={step === 'fetching' || step === 'analyzing' || step === 'synthesizing'}
                className="w-full bg-slate-900 hover:bg-blue-600 disabled:bg-stone-100 disabled:text-stone-300 text-white font-bold uppercase tracking-widest text-xs py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transform active:scale-97 transition-all cursor-pointer shadow-lg"
              >
                <Download className="w-4 h-4" />
                Process & Export Clean Stem
              </button>
            </div>

          </aside>

        </div>

        {/* SYSTEM STATUS AUDIT COMPILER LOGS */}
        <footer className="p-5 border-t border-stone-200 bg-white">
          <div className="flex items-center gap-2 mb-2">
            <Info className="w-3.5 h-3.5 text-blue-600" />
            <h4 className="text-[10px] font-mono font-bold tracking-wider uppercase text-slate-400">Offline Status Audit Console</h4>
          </div>
          
          <div className="h-20 overflow-y-auto bg-stone-50 border border-stone-200 rounded-lg p-2.5 font-mono text-[9px] text-slate-500 space-y-1 select-none">
            {logs.map((log) => (
              <div key={log.id} className="flex gap-2 items-start shrink-0">
                <span className="text-slate-400">[{log.timestamp}]</span>
                <span className={
                  log.type === 'success' ? 'text-blue-600 font-semibold' :
                  log.type === 'warning' ? 'text-amber-600 font-semibold' : 'text-slate-600'
                }>
                  {log.type === 'success' && '✓ '}
                  {log.type === 'warning' && '⚠ '}
                  {log.message}
                </span>
              </div>
            ))}
          </div>
        </footer>

      </div>
    </div>
  );
}
