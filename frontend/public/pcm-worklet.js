// Downsamples mic audio to 16 kHz mono PCM16 and posts ~100 ms frames.
class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.ratio = sampleRate / 16000;
    this.acc = 0;
    this.sum = 0;
    this.n = 0;
    this.out = [];
  }

  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (!channel) return true;

    for (let i = 0; i < channel.length; i++) {
      this.sum += channel[i];
      this.n++;
      this.acc += 1;
      if (this.acc >= this.ratio) {
        this.acc -= this.ratio;
        this.out.push(this.sum / this.n);
        this.sum = 0;
        this.n = 0;
      }
    }

    if (this.out.length >= 1600) {
      const pcm = new Int16Array(this.out.length);
      let peak = 0;
      for (let i = 0; i < this.out.length; i++) {
        const s = Math.max(-1, Math.min(1, this.out[i]));
        pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        peak = Math.max(peak, Math.abs(s));
      }
      this.port.postMessage({ pcm: pcm.buffer, level: peak }, [pcm.buffer]);
      this.out = [];
    }
    return true;
  }
}

registerProcessor('pcm-processor', PCMProcessor);
