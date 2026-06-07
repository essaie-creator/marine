import { useEffect, useRef } from "react";
import { DspConfig, ProcessorStep } from "../types";

interface AudioVisualizerProps {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  step: ProcessorStep;
  dspConfig: DspConfig;
}

export default function AudioVisualizer({ analyser, isPlaying, step, dspConfig }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Fluid responsive sizing
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Audio sampling setups
    let dataArray: Uint8Array;
    let bufferLength = 0;
    if (analyser) {
      analyser.fftSize = 128;
      bufferLength = analyser.frequencyBinCount;
      dataArray = new Uint8Array(bufferLength);
    }

    let phase = 0;

    const render = () => {
      const width = canvas.width / window.devicePixelRatio;
      const height = canvas.height / window.devicePixelRatio;

      // Clear with elegant translucent warm-stone background trails
      ctx.fillStyle = "rgba(250, 250, 249, 0.25)";
      ctx.fillRect(0, 0, width, height);

      // Draw horizontal layout grid lines
      ctx.strokeStyle = "rgba(120, 113, 108, 0.08)";
      ctx.lineWidth = 1;
      for (let i = 1; i < 4; i++) {
        const y = (height / 4) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      phase += 0.08;

      if (analyser && isPlaying) {
        // True interactive audio plotting
        analyser.getByteFrequencyData(dataArray);

        // Render reactive frequencies
        const barWidth = width / bufferLength;
        
        ctx.beginPath();
        for (let i = 0; i < bufferLength; i++) {
          const percent = dataArray[i] / 255;
          const barHeight = percent * (height * 0.7);

          // Create a dual-sided neon gradient bar
          const x = i * barWidth;
          const y = height / 2;

          // Stem separation visualization: lower frequencies represent Bass/Inst, highs are vocal sparkles
          const isVocalFreq = i > bufferLength * 0.5;
          
          let color = "rgba(37, 99, 235, 0.8)"; // Royal blue (Instrumentals)
          if (isVocalFreq) {
            const attenuation = dspConfig.vocalAttenuation;
            const alpha = Math.max(0.04, 0.85 - attenuation * 0.8);
            color = `rgba(139, 92, 246, ${alpha})`; // Elegant Violet (Vocals)
          }

          // Custom visual effect additions based on prompting
          const soundMultiplier = 1 + dspConfig.tapeFluter * 0.3;

          ctx.fillStyle = color;
          ctx.fillRect(x, y - (barHeight / 2) * soundMultiplier, barWidth - 1, barHeight * soundMultiplier);
        }

        // Draw a central floating line with reverb reflection
        ctx.beginPath();
        ctx.strokeStyle = "rgba(15, 23, 42, 0.65)"; // Slate prompt overlay
        ctx.lineWidth = 1.5;
        const sliceWidth = width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const offset = (v - 1.0) * (height * 0.25) * dspConfig.reverbWet;
          const y = height / 2 + offset;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }
        ctx.stroke();

      } else {
        // High-fidelity conceptual visualization of pipeline steps
        ctx.lineWidth = 1.5;

        if (step === 'idle') {
          // Calm glowing geometric waves
          const waveCount = 3;
          for (let w = 0; w < waveCount; w++) {
            ctx.beginPath();
            const alpha = 0.4 - w * 0.12;
            ctx.strokeStyle = `rgba(37, 99, 235, ${alpha})`; // Royal Blue Waves
            
            for (let x = 0; x < width; x++) {
              const frequency = 0.01 + w * 0.005;
              const amp = 12 - w * 2.5;
              const y = height / 2 + Math.sin(x * frequency + phase + w) * amp;
              if (x === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.stroke();
          }

          // Central focus text indicator
          ctx.fillStyle = "rgba(15, 23, 42, 0.35)";
          ctx.font = "bold 9px monospace";
          ctx.fillText("PIPELINE STATUS: STANDBY", 12, 18);

        } else if (step === 'fetching' || step === 'analyzing') {
          // Rapid scanning pulse representing URL capture and feature analyzer
          const scanLineX = (phase * 80) % width;
          ctx.strokeStyle = "rgba(37, 99, 235, 0.3)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(scanLineX, 0);
          ctx.lineTo(scanLineX, height);
          ctx.stroke();

          // Glitchy matrix noise particles representing downloading/parsing
          ctx.fillStyle = "rgba(37, 99, 235, 0.75)";
          for (let p = 0; p < 8; p++) {
            const px = Math.sin(phase + p) * 100 + width / 2;
            const py = (p * 15) % height;
            ctx.fillRect(px, py, 2.5, 2.5);
          }

          ctx.fillStyle = "rgba(15, 23, 42, 0.65)";
          ctx.font = "bold 9px monospace";
          const scanText = step === 'fetching' ? "FETCHING COGNITIVE STREAM..." : "ALGORITHMIC SPECTRAL ANALYSIS...";
          ctx.fillText(scanText, 12, 18);

        } else if (step === 'isolating') {
          // Dual frequency separation illustration
          const attenuation = dspConfig.vocalAttenuation;
          
          // Vocal Line (dimming as attenuation goes to 1.0)
          ctx.strokeStyle = `rgba(139, 92, 246, ${Math.max(0.04, 0.8 - attenuation * 0.75)})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          for (let x = 0; x < width; x++) {
            const y = height * 0.35 + Math.sin(x * 0.03 + phase * 1.5) * (18 * (1 - attenuation));
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();

          // Instrumental line (bold, secure)
          ctx.strokeStyle = "rgba(37, 99, 235, 0.85)";
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          for (let x = 0; x < width; x++) {
            const y = height * 0.65 + Math.cos(x * 0.015 + phase) * 12;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();

          ctx.fillStyle = "rgba(139, 92, 246, 0.8)";
          ctx.font = "bold 9px monospace";
          ctx.fillText(`ISOLATING INSTRUMENTAL STEM | ATTENUATION: ${(attenuation * 100).toFixed(0)}%`, 12, 18);

        } else if (step === 'overlaying' || step === 'synthesizing') {
          // Complex interwoven colorful matrix of waves
          ctx.lineWidth = 1.2;

          const promptColors = [
            "rgba(15, 23, 42, 0.6)",     // Slate
            "rgba(37, 99, 235, 0.5)",    // Blue
            "rgba(217, 119, 6, 0.4)"     // Warm amber
          ];

          promptColors.forEach((color, idx) => {
            ctx.beginPath();
            ctx.strokeStyle = color;
            for (let x = 0; x < width; x++) {
              const speed = 1.2 + idx * 0.3;
              const amp = 8 + dspConfig.reverbWet * 15 + idx * 4;
              const frequency = 0.02 + idx * 0.01;
              const y = height / 2 + Math.sin(x * frequency + phase * speed) * amp;
              if (x === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.stroke();
          });

          // Draw random dots representing "analog vinyl tape crackle"
          if (dspConfig.vinylVolume > 0.05) {
            ctx.fillStyle = `rgba(217, 119, 6, ${dspConfig.vinylVolume * 0.5})`;
            const particles = Math.floor(dspConfig.vinylVolume * 15);
            for (let i = 0; i < particles; i++) {
              const rx = (Math.sin(phase + i) * 123456) % width;
              const ry = (Math.cos(phase * i) * 654321) % height;
              ctx.fillRect(Math.abs(rx), Math.abs(ry), 1.5, 1.5);
            }
          }

          ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
          ctx.font = "bold 9px monospace";
          const processText = step === 'overlaying' 
            ? `OVERLAYING AI PROMPT: "${dspConfig.vibeDescription.toUpperCase()}"`
            : "SYNTHESIZING COPYRIGHT-NEUTRAL EXPORT PREPARATION (44.1KHZ WAV)...";
          ctx.fillText(processText, 12, 18);

        } else if (step === 'completed') {
          // Calm beautiful green/blue double glow line
          ctx.strokeStyle = "rgba(37, 99, 235, 0.85)";
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          for (let x = 0; x < width; x++) {
            const y = height / 2 + Math.sin(x * 0.01 + phase * 0.2) * 5;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();

          ctx.fillStyle = "rgba(37, 99, 235, 0.85)";
          ctx.font = "bold 9px monospace";
          ctx.fillText("EXPORT READY: CHANNELS ALIGNED | NORMALIZED AT -14 LUFS | 44.1KHZ STEREO", 12, 18);
        }
      }

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [analyser, isPlaying, step, dspConfig]);

  return (
    <div className="relative w-full h-32 bg-stone-100 border border-stone-250 rounded-xl overflow-hidden shadow-inner flex flex-col justify-end">
      {/* Subtle top glare */}
      <div className="absolute inset-x-0 top-0 h-4 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
      
      {/* Minimal steel rivet anchors */}
      <div className="absolute top-2 left-2 w-1.5 h-1.5 bg-stone-300 rounded-full pointer-events-none" />
      <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-stone-300 rounded-full pointer-events-none" />
      <div className="absolute bottom-2 left-2 w-1.5 h-1.5 bg-stone-300 rounded-full pointer-events-none" />
      <div className="absolute bottom-2 right-2 w-1.5 h-1.5 bg-stone-300 rounded-full pointer-events-none" />

      {/* Grid decibel labels */}
      <div className="absolute right-3 top-3 text-[8px] font-mono text-slate-450 space-y-0.5 select-none text-right font-bold">
        <div>dB SPL</div>
        <div>+6.0 —</div>
        <div>0.0 —</div>
        <div>-12.0 —</div>
        <div>-48.0 —</div>
      </div>

      <canvas 
        ref={canvasRef} 
        id="audio-spectrum-canvas"
        className="w-full h-full block" 
      />
    </div>
  );
}
