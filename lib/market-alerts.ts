type MarketKind = "forex" | "stocks";

const BELL_SRC = "/sounds/closing-bell.mp3";

let bell: HTMLAudioElement | null = null;

function getBell() {
  if (typeof window === "undefined") return null;
  if (!bell) {
    bell = new Audio(BELL_SRC);
    bell.preload = "auto";
    bell.volume = 1;
  }
  return bell;
}

export async function unlockMarketAudio() {
  const audio = getBell();
  if (!audio) return;
  audio.muted = true;
  try {
    await audio.play();
    audio.pause();
    audio.currentTime = 0;
  } catch {
    // Needs a click before the browser will arm audio.
  }
  audio.muted = false;
}

export async function playClosingBell() {
  const audio = getBell();
  if (!audio) return;
  audio.pause();
  audio.currentTime = 0;
  audio.muted = false;
  audio.volume = 1;
  await audio.play();
}

export function announceMarketOpen(kind: MarketKind) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const text =
    kind === "forex"
      ? "Forex. Market open!"
      : "New York Stock Exchange. Market open!";
  const speak = () => {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.95;
    utter.pitch = 1;
    utter.volume = 1;
    const voices = window.speechSynthesis.getVoices();
    const voice =
      voices.find(
        (item) =>
          item.lang.startsWith("en") &&
          /Google|Samantha|Alex|Daniel|Karen|Moira/i.test(item.name),
      ) ?? voices.find((item) => item.lang.startsWith("en-US") || item.lang.startsWith("en"));
    if (voice) utter.voice = voice;
    window.speechSynthesis.speak(utter);
  };
  if (window.speechSynthesis.getVoices().length === 0) {
    window.speechSynthesis.addEventListener("voiceschanged", speak, {
      once: true,
    });
  }
  speak();
}

export async function testMarketAlerts(kind: MarketKind) {
  await unlockMarketAudio();
  const audio = getBell();
  if (!audio) return;
  const after = () => {
    audio.removeEventListener("ended", after);
    announceMarketOpen(kind);
  };
  audio.addEventListener("ended", after);
  await playClosingBell();
}
