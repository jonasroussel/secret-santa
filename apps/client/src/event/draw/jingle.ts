const E = 659.25;
const G = 783.99;
const C = 523.25;
const D = 587.33;
const beat = 0.18;
// The opening of « Vive le vent »: [note, start in beats].
const melody: [number, number][] = [
  [E, 0],
  [E, 1],
  [E, 2],
  [E, 4],
  [E, 5],
  [E, 6],
  [E, 8],
  [G, 9],
  [C, 10],
  [D, 11],
  [E, 12],
];

/** Plays a short bell melody; must start from a user gesture. Returns a function that stops it. */
export function playJingle(): () => void {
  const context = new AudioContext();
  const output = context.createGain();
  output.gain.value = 0.25;
  output.connect(context.destination);

  for (const [frequency, start] of melody) {
    const at = context.currentTime + start * beat;
    // A bell: the fundamental plus a quieter inharmonic overtone, both with a sharp attack and a long decay.
    for (const [ratio, volume] of [
      [1, 1],
      [2.76, 0.3],
    ] as const) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = frequency * ratio;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(volume, at + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.7);
      oscillator.connect(gain).connect(output);
      oscillator.start(at);
      oscillator.stop(at + 0.75);
    }
  }

  const stop = () => {
    if (context.state !== 'closed') void context.close();
  };
  setTimeout(stop, 4000);
  return stop;
}
