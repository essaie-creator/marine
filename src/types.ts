export interface LinkMetadata {
  title: string;
  artist: string;
  platform: 'youtube' | 'spotify' | 'deezer' | 'other';
  duration: string;
  bpm: number;
  key: string;
  genre: string;
  coverUrl: string;
}

export interface DspConfig {
  vocalAttenuation: number; // 0 to 1 (1 is max vocal removal)
  reverbWet: number;         // 0 to 1
  vinylVolume: number;       // 0 to 1
  tapeFluter: number;        // 0 to 1 (detune rate)
  bassGain: number;          // -10 to +10 dB
  trebleGain: number;       // -10 to +10 dB
  playbackRate: number;      // 0.8 to 1.2x (transposition / bypass copyright match)
  delayFeedback: number;     // 0 to 0.8
  lowpassFreq: number;       // 200 to 20000 Hz
  synthDroneVolume: number;  // 0 to 1 (shadow sub-synth)
  vibeDescription: string;   // Short description of the prompt overlay
}

export type ProcessorStep = 
  | 'idle'
  | 'fetching'
  | 'analyzing'
  | 'isolating'   // Vocal removing
  | 'overlaying'  // Prompt application
  | 'synthesizing' // Offline compilation
  | 'completed'
  | 'failed';

export interface AuditLog {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warning';
}

export interface Preset {
  id: string;
  name: string;
  prompt: string;
  icon: string;
  config: Partial<DspConfig>;
}
