let audioCtx: AudioContext | null = null;

function ctx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    try {
      audioCtx = new AudioContext();
    } catch {
      return null;
    }
  }
  return audioCtx;
}

/** Campana corta al recibir mensaje de Informa Aragua */
export function reproducirCampanaInforma(): void {
  const ac = ctx();
  if (!ac) return;

  const play = () => {
    const t = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.exponentialRampToValueAtTime(660, t + 0.12);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);

    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(t);
    osc.stop(t + 0.6);

    const osc2 = ac.createOscillator();
    const gain2 = ac.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1320, t + 0.05);
    gain2.gain.setValueAtTime(0.0001, t + 0.05);
    gain2.gain.exponentialRampToValueAtTime(0.12, t + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    osc2.connect(gain2);
    gain2.connect(ac.destination);
    osc2.start(t + 0.05);
    osc2.stop(t + 0.45);
  };

  if (ac.state === "suspended") {
    void ac.resume().then(play).catch(() => {});
  } else {
    play();
  }
}
