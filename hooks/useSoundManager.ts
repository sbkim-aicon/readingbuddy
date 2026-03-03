"use client";

import { useRef, useCallback, useEffect } from 'react';
import { SoundConfig } from '@/lib/types';

// ── Web Audio tone primitive ─────────────────────────────────────────────────
function tone(
    ctx: AudioContext,
    freq: number,
    startAt: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume = 0.22,
) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq;
    osc.type = type;
    gain.gain.setValueAtTime(volume, startAt);
    gain.gain.exponentialRampToValueAtTime(0.001, startAt + duration);
    osc.start(startAt);
    osc.stop(startAt + duration);
}

// ── Synthesized SFX patterns ─────────────────────────────────────────────────
const SFX: Record<string, (ctx: AudioContext) => void> = {
    correct: (ctx) => {
        const t = ctx.currentTime;
        tone(ctx, 523,  t,        0.12); // C5
        tone(ctx, 659,  t + 0.10, 0.12); // E5
        tone(ctx, 784,  t + 0.20, 0.12); // G5
        tone(ctx, 1047, t + 0.30, 0.28); // C6
    },
    wrong: (ctx) => {
        const t = ctx.currentTime;
        tone(ctx, 280, t,        0.15, 'sawtooth', 0.18);
        tone(ctx, 220, t + 0.15, 0.30, 'sawtooth', 0.18);
    },
    hint: (ctx) => {
        const t = ctx.currentTime;
        tone(ctx, 880,  t,        0.12, 'sine', 0.18);
        tone(ctx, 1047, t + 0.13, 0.22, 'sine', 0.18);
    },
    game_start: (ctx) => {
        const t = ctx.currentTime;
        [523, 659, 784, 1047, 1319].forEach((freq, i) => {
            tone(ctx, freq, t + i * 0.09, 0.18, 'triangle', 0.2);
        });
    },
    level_up: (ctx) => {
        const t = ctx.currentTime;
        [523, 659, 784, 1047].forEach((freq, i) => {
            tone(ctx, freq, t + i * 0.07, 0.14, 'sine', 0.2);
        });
        tone(ctx, 1319, t + 0.30, 0.40, 'sine', 0.2);
    },
    // Ocean shimmer — rapid high arpeggiation
    splash: (ctx) => {
        const t = ctx.currentTime;
        [1319, 1175, 988, 1047, 1175, 1319].forEach((freq, i) => {
            tone(ctx, freq, t + i * 0.055, 0.09, 'sine', 0.14);
        });
    },
    // Soccer goal fanfare
    goal: (ctx) => {
        const t = ctx.currentTime;
        tone(ctx, 659,  t,        0.10, 'square', 0.15);
        tone(ctx, 784,  t + 0.10, 0.10, 'square', 0.15);
        tone(ctx, 1047, t + 0.20, 0.15, 'square', 0.15);
        tone(ctx, 1319, t + 0.36, 0.40, 'sine',   0.20);
    },
};

// ── Hook ─────────────────────────────────────────────────────────────────────
export function useSoundManager(sounds?: SoundConfig) {
    const audioCtxRef = useRef<AudioContext | null>(null);
    const bgmRef = useRef<HTMLAudioElement | null>(null);

    // Create AudioContext lazily after a user gesture
    const getCtx = useCallback(() => {
        if (!audioCtxRef.current) {
            audioCtxRef.current = new AudioContext();
        }
        if (audioCtxRef.current.state === 'suspended') {
            audioCtxRef.current.resume();
        }
        return audioCtxRef.current;
    }, []);

    const playSFX = useCallback((name: string) => {
        try {
            const synth = SFX[name];
            if (synth) synth(getCtx());
            else console.warn(`[SoundManager] Unknown SFX: "${name}"`);
        } catch (e) {
            console.warn('[SoundManager] SFX error:', e);
        }
    }, [getCtx]);

    const startBGM = useCallback(() => {
        if (!sounds?.bgm) return;
        try {
            if (!bgmRef.current) {
                const el = document.createElement('audio');
                el.loop = true;
                el.volume = sounds.bgm_volume ?? 0.2;
                el.src = sounds.bgm;
                el.style.display = 'none';
                document.body.appendChild(el);
                bgmRef.current = el;
            }
            bgmRef.current.play().catch(() => {
                // Silently skip if file doesn't exist yet
            });
        } catch (e) {
            console.warn('[SoundManager] BGM start error:', e);
        }
    }, [sounds]);

    const stopBGM = useCallback(() => {
        const bgm = bgmRef.current;
        if (!bgm || bgm.paused) return;
        // Fade out over ~1 second
        const targetVolume = sounds?.bgm_volume ?? 0.2;
        const step = targetVolume / 20;
        const fade = setInterval(() => {
            if (!bgmRef.current) { clearInterval(fade); return; }
            if (bgmRef.current.volume > step) {
                bgmRef.current.volume = Math.max(0, bgmRef.current.volume - step);
            } else {
                bgmRef.current.pause();
                bgmRef.current.volume = targetVolume;
                clearInterval(fade);
            }
        }, 50);
    }, [sounds]);

    useEffect(() => {
        return () => {
            bgmRef.current?.pause();
            bgmRef.current?.remove();
            bgmRef.current = null;
            audioCtxRef.current?.close();
            audioCtxRef.current = null;
        };
    }, []);

    return { playSFX, startBGM, stopBGM };
}
