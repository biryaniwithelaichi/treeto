export class NoiseEstimator {
  private noiseFloor: number = 0.01; // Initial reasonable value
  private readonly alpha: number = 0.05; // Update rate: 5% new, 95% old
  private lastLogTime: number = 0;
  private readonly logThrottleMs: number = 5000; // Log every 5 seconds max

  constructor(initialNoiseFloor: number = 0.01) {
    this.noiseFloor = initialNoiseFloor;
  }

  updateWithSilenceRms(rms: number): void {
    // Exponential moving average during silence
    this.noiseFloor = this.noiseFloor * (1 - this.alpha) + rms * this.alpha;

    // Throttled logging
    const now = Date.now();
    if (now - this.lastLogTime > this.logThrottleMs) {
      console.log(`[noise] floor updated: ${this.noiseFloor.toFixed(4)}`);
      this.lastLogTime = now;
    }
  }

  getNoiseFloor(): number {
    return this.noiseFloor;
  }

  getAdaptiveThreshold(absoluteMin: number, noiseMultiplier: number): number {
    return Math.max(absoluteMin, this.noiseFloor * noiseMultiplier);
  }
}