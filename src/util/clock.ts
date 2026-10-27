/** Injectable clock (unix seconds) so tests can move time: expiry, retention, erasure. */
export interface Clock {
  now(): number;
}

export const systemClock: Clock = { now: () => Math.floor(Date.now() / 1000) };

export class ManualClock implements Clock {
  constructor(private t: number) {}
  now(): number {
    return this.t;
  }
  set(t: number): void {
    this.t = t;
  }
  advance(seconds: number): void {
    this.t += seconds;
  }
}

export const DAY = 86_400;
export const YEAR = 365 * DAY;
