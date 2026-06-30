class ShoppyRelayCaptureProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const processorOptions = options && options.processorOptions ? options.processorOptions : {};
    this.targetSampleRate = processorOptions.targetSampleRate || 16000;
    this.packetSize = processorOptions.packetSize || 320; // 20ms at 16kHz
    this.downsampleRatio = sampleRate / this.targetSampleRate;
    this.pending = [];
  }

  pushSample(value) {
    const safe = Math.max(-1, Math.min(1, value || 0));
    this.pending.push(safe);
    if (this.pending.length >= this.packetSize) {
      const pcm = new Int16Array(this.packetSize);
      for (let i = 0; i < this.packetSize; i += 1) {
        const sample = this.pending[i];
        pcm[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      }
      this.pending = this.pending.slice(this.packetSize);
      this.port.postMessage({ chunk: pcm.buffer, sampleRate: this.targetSampleRate, channels: 1 }, [pcm.buffer]);
    }
  }

  process(inputs, outputs) {
    const input = inputs && inputs[0] && inputs[0][0];
    if (!input) return true;

    if (this.downsampleRatio <= 1) {
      for (let i = 0; i < input.length; i += 1) this.pushSample(input[i]);
    } else {
      let offset = 0;
      while (offset < input.length) {
        const nextOffset = Math.min(input.length, Math.round(offset + this.downsampleRatio));
        let sum = 0;
        let count = 0;
        for (let j = Math.floor(offset); j < nextOffset; j += 1) {
          sum += input[j] || 0;
          count += 1;
        }
        this.pushSample(count ? sum / count : 0);
        offset += this.downsampleRatio;
      }
    }

    const output = outputs && outputs[0] && outputs[0][0];
    if (output) output.fill(0);
    return true;
  }
}

registerProcessor('shoppy-relay-capture', ShoppyRelayCaptureProcessor);
