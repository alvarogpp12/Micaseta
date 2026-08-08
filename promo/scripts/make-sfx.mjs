/**
 * Sintetiza los efectos de sonido del tráiler como WAV (44.1kHz, 16-bit).
 * Sin dependencias ni licencias: todo generado.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SR = 44100;
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/sfx');
fs.mkdirSync(OUT, { recursive: true });

function writeWav(name, samples) {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  }
  fs.writeFileSync(path.join(OUT, name), buf);
  console.log('✓', name, (buf.length / 1024).toFixed(0) + 'KB');
}

const secs = (s) => Math.round(s * SR);
const env = (i, n, a, r) => {
  const t = i / n;
  if (t < a) return t / a;
  if (t > 1 - r) return (1 - t) / r;
  return 1;
};
let seed = 42;
const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff * 2 - 1; };

// --- whoosh: barrido de ruido filtrado (transiciones de escena) ---
{
  const n = secs(0.55), out = new Float32Array(n);
  let lp = 0;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const cutoff = 0.02 + 0.5 * Math.sin(Math.PI * t) ** 2;
    lp += cutoff * (rand() - lp);
    out[i] = lp * env(i, n, 0.25, 0.35) * 0.8;
  }
  writeWav('whoosh.wav', out);
}

// --- tap: golpe corto tipo pulsación (dedo en pantalla) ---
{
  const n = secs(0.09), out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const f = 950 - 500 * (i / n);
    out[i] = (Math.sin(2 * Math.PI * f * t) * 0.7 + rand() * 0.25) * Math.exp(-i / (n * 0.22)) * 0.85;
  }
  writeWav('tap.wav', out);
}

// --- pop: burbuja al seleccionar producto ---
{
  const n = secs(0.14), out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const f = 420 + 480 * Math.exp(-i / (n * 0.18));
    out[i] = Math.sin(2 * Math.PI * f * t) * Math.exp(-i / (n * 0.3)) * 0.8;
  }
  writeWav('pop.wav', out);
}

// --- ding: éxito (dos parciales de campana) ---
{
  const n = secs(0.9), out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const d = Math.exp(-i / (n * 0.35));
    out[i] = (Math.sin(2 * Math.PI * 1318.5 * t) * 0.5 + Math.sin(2 * Math.PI * 1975.5 * t) * 0.3 + Math.sin(2 * Math.PI * 659 * t) * 0.25) * d * 0.6;
  }
  writeWav('ding.wav', out);
}

// --- caja registradora suave: liquidación ---
{
  const n = secs(0.5), out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const d = Math.exp(-i / (n * 0.3));
    const bell = Math.sin(2 * Math.PI * 2093 * t) * 0.4 + Math.sin(2 * Math.PI * 2637 * t) * 0.3;
    const clink = i < secs(0.03) ? rand() * 0.5 : 0;
    out[i] = (bell * d + clink) * 0.7;
  }
  writeWav('caja.wav', out);
}

// --- shutter: obturador de cámara (selfie) ---
{
  const n = secs(0.16), out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const g1 = i < secs(0.02) ? 1 : 0;
    const g2 = i > secs(0.07) && i < secs(0.1) ? 0.8 : 0;
    out[i] = rand() * (g1 + g2) * 0.8;
  }
  writeWav('shutter.wav', out);
}

// --- teclas: tick de escritura ---
{
  const n = secs(0.05), out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = (rand() * 0.5 + Math.sin(2 * Math.PI * 2400 * i / SR) * 0.3) * Math.exp(-i / (n * 0.2)) * 0.5;
  }
  writeWav('key.wav', out);
}

// --- sparkle: QR materializándose (arpegio rápido) ---
{
  const n = secs(0.8), out = new Float32Array(n);
  const notes = [1046.5, 1318.5, 1568, 2093];
  notes.forEach((f, k) => {
    const start = secs(0.12 * k);
    for (let i = 0; i < secs(0.3) && start + i < n; i++) {
      const t = i / SR;
      out[start + i] += Math.sin(2 * Math.PI * f * t) * Math.exp(-i / secs(0.09)) * 0.35;
    }
  });
  writeWav('sparkle.wav', out);
}

// --- riser: subida hacia el final ---
{
  const n = secs(1.6), out = new Float32Array(n);
  let lp = 0;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const f = 80 + 900 * t * t;
    const cutoff = 0.01 + 0.4 * t;
    lp += cutoff * (rand() - lp);
    out[i] = (Math.sin(2 * Math.PI * f * (i / SR)) * 0.3 + lp * 0.5) * t * 0.8;
  }
  writeWav('riser.wav', out);
}

// --- hit final: impacto + cola ---
{
  const n = secs(1.4), out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const d = Math.exp(-i / (n * 0.25));
    const boom = Math.sin(2 * Math.PI * (55 + 40 * Math.exp(-i / secs(0.05))) * t) * d;
    const shine = (Math.sin(2 * Math.PI * 880 * t) * 0.2 + Math.sin(2 * Math.PI * 1318.5 * t) * 0.15) * Math.exp(-i / (n * 0.5));
    out[i] = (boom * 0.8 + shine) * 0.85;
  }
  writeWav('hit.wav', out);
}

// --- base rítmica 44s @112BPM: bombo + hats + bajo (volumen bajo) ---
{
  const BPM = 112, beat = 60 / BPM, n = secs(46), out = new Float32Array(n);
  const bassNotes = [55, 55, 65.4, 49]; // A, A, C, G — compás por nota
  for (let b = 0; b * beat < 46; b++) {
    const start = secs(b * beat);
    // bombo en cada beat
    for (let i = 0; i < secs(0.14) && start + i < n; i++) {
      const t = i / SR;
      out[start + i] += Math.sin(2 * Math.PI * (100 * Math.exp(-i / secs(0.03)) + 45) * t) * Math.exp(-i / secs(0.05)) * 0.5;
    }
    // hat en contratiempo
    const hs = start + secs(beat / 2);
    for (let i = 0; i < secs(0.03) && hs + i < n; i++) {
      out[hs + i] += rand() * Math.exp(-i / secs(0.008)) * 0.12;
    }
    // bajo: nota por compás, pulso corto en cada beat
    const note = bassNotes[Math.floor(b / 4) % bassNotes.length];
    for (let i = 0; i < secs(0.32) && start + i < n; i++) {
      const t = i / SR;
      out[start + i] += Math.sin(2 * Math.PI * note * t) * Math.exp(-i / secs(0.18)) * 0.22;
    }
  }
  // fundido inicial y final
  const fadeN = secs(1.2);
  for (let i = 0; i < fadeN; i++) { out[i] *= i / fadeN; out[n - 1 - i] *= i / fadeN; }
  writeWav('bed.wav', out);
}

console.log('SFX listos en', OUT);
