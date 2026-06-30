export function getAudioContextConstructor() {
  return window.AudioContext || (window as any).webkitAudioContext;
}

export function floatToPcm16(input: Float32Array) {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, input[i]));
    output[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }
  return output.buffer as ArrayBuffer;
}

export function downsampleFloat32(input: Float32Array, inputRate: number, outputRate = 16000) {
  if (!inputRate || inputRate <= outputRate) return input;
  const ratio = inputRate / outputRate;
  const outputLength = Math.max(1, Math.floor(input.length / ratio));
  const output = new Float32Array(outputLength);
  let inputOffset = 0;
  for (let i = 0; i < outputLength; i += 1) {
    const nextOffset = Math.round((i + 1) * ratio);
    let sum = 0;
    let count = 0;
    for (let j = inputOffset; j < nextOffset && j < input.length; j += 1) {
      sum += input[j];
      count += 1;
    }
    output[i] = count ? sum / count : 0;
    inputOffset = nextOffset;
  }
  return output;
}

export function normalizeBinaryPayload(input: any): ArrayBuffer {
  if (input instanceof ArrayBuffer) return input;
  if (ArrayBuffer.isView(input)) {
    const view = input as ArrayBufferView;
    return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength) as ArrayBuffer;
  }
  if (input?.type === 'Buffer' && Array.isArray(input.data)) {
    return new Uint8Array(input.data).buffer as ArrayBuffer;
  }
  if (Array.isArray(input)) return new Uint8Array(input).buffer as ArrayBuffer;
  throw new Error('Unsupported relay audio payload');
}

export function pcm16ToFloat(input: ArrayBuffer) {
  const pcm = new Int16Array(input);
  const output = new Float32Array(pcm.length);
  for (let i = 0; i < pcm.length; i += 1) output[i] = pcm[i] / 0x8000;
  return output;
}

export async function ensureAudioContext(existing?: AudioContext | null) {
  const AudioContextCtor = getAudioContextConstructor();
  if (!AudioContextCtor) throw new Error('This browser does not support live audio relay.');
  const ctx = existing && existing.state !== 'closed' ? existing : new AudioContextCtor();
  if (ctx.state === 'suspended') await ctx.resume();
  return ctx;
}
