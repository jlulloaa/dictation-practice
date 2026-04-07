import React, { useState, useCallback, useRef } from "react";

const DEFAULT_WORDS = [
  "Hill", "Stone", "Desert","Land",
  "Wood","Stream","Ocean","Fire",
  "Cave","Dinosaur","Butterflies","Beetle",
  "Eagle","Camels","Tortoise","Swan","Octopus"
];

function playFanfare() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const notes = [
    { freq: 523.25, start: 0,    dur: 0.15 },
    { freq: 659.25, start: 0.15, dur: 0.15 },
    { freq: 783.99, start: 0.3,  dur: 0.15 },
    { freq: 1046.5, start: 0.45, dur: 0.4  },
    { freq: 783.99, start: 0.85, dur: 0.15 },
    { freq: 1046.5, start: 1.0,  dur: 0.5  },
  ];
  notes.forEach(({ freq, start, dur }) => {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "square";
    osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
    gain.gain.setValueAtTime(0.15, ctx.currentTime + start);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
    osc.start(ctx.currentTime + start);
    osc.stop(ctx.currentTime + start + dur + 0.01);
  });
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

let speakTimer = null;
function getBritishVoice() {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find(v => v.lang === "en-GB") ||
    voices.find(v => v.lang.startsWith("en")) ||
    null
  );
}

function speak(word) {
  window.speechSynthesis.cancel();
  clearTimeout(speakTimer);
  speakTimer = setTimeout(() => {
    const utter = new SpeechSynthesisUtterance(word);
    utter.lang  = "en-GB";
    utter.rate  = 0.85;
    utter.pitch = 1;
    const voice = getBritishVoice();
    // if (voice) utter.voice = voice;
    window.speechSynthesis.speak(utter);
  }, 150);
}

function parseWords(input) {
  return input.split(/[\n,]+/).map(w => w.trim()).filter(Boolean);
}

export default function App() {
  const [wordInput,    setWordInput]    = useState(DEFAULT_WORDS.join(", "));
  const [words,        setWords]        = useState(DEFAULT_WORDS);
  const [queue,        setQueue]        = useState([]);
  const [currentWord,  setCurrentWord]  = useState(null);
  const [phase,        setPhase]        = useState("idle"); // idle | running | success
  const [progress,     setProgress]     = useState({ done: 0, total: 0 });
  const wordsRef = useRef(words);

  const startWith = (parsed) => {
    wordsRef.current = parsed;
    setWords(parsed);
    const q = shuffle(parsed);
    setQueue(q.slice(1));
    setCurrentWord(q[0]);
    setPhase("running");
    setProgress({ done: 1, total: parsed.length });
    speak(q[0]);
  };

  const handleStart = () => {
    const parsed = parseWords(wordInput);
    if (!parsed.length) return;
    startWith(parsed);
  };

  const handleNext = useCallback(() => {
    setQueue(prevQueue => {
      if (prevQueue.length === 0) {
        // All done!
        setCurrentWord(null);
        setPhase("success");
        playFanfare();
        setTimeout(() => {
          startWith(wordsRef.current);
        }, 3000);
        return [];
      }
      const next = prevQueue[0];
      setCurrentWord(next);
      setProgress(p => ({ ...p, done: p.done + 1 }));
      speak(next);
      return prevQueue.slice(1);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReset = () => {
    window.speechSynthesis.cancel();
    setPhase("idle");
    setCurrentWord(null);
    setQueue([]);
    setProgress({ done: 0, total: 0 });
  };

  const progressPct = progress.total
    ? Math.round((progress.done / progress.total) * 100)
    : 0;

  return (
    <div className="min-vh-100 d-flex flex-column">
      {/* Navbar */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
        <div className="container">
          <span className="navbar-brand fw-bold fs-4">🚀 Dictation App</span>
          <span className="badge bg-light text-primary fs-6">Spacelab</span>
        </div>
      </nav>

      <div className="container py-5 flex-grow-1">
        <div className="row justify-content-center">
          <div className="col-lg-7 col-md-9">

            {/* Word Input Card */}
            <div className="card shadow-sm mb-4">
              <div className="card-header bg-primary text-white">
                <h5 className="mb-0">📝 Word List</h5>
              </div>
              <div className="card-body">
                <label className="form-label text-muted small">
                  Enter words separated by commas or newlines
                </label>
                <textarea
                  className="form-control"
                  rows={4}
                  value={wordInput}
                  onChange={e => setWordInput(e.target.value)}
                  disabled={phase === "running"}
                  placeholder="apple, banana, cherry..."
                  style={{ fontFamily: "monospace", fontSize: "0.9rem" }}
                />
                <div className="mt-2 text-muted small">
                  {parseWords(wordInput).length} word(s) detected
                </div>
              </div>
            </div>

            {/* Dictation Display */}
            <div className="card shadow-sm mb-4">
              <div className="card-body text-center py-5">
                {phase === "idle" && (
                  <div>
                    <div className="display-1 mb-3" style={{ opacity: 0.2 }}>🔤</div>
                    <p className="text-muted">
                      Press <strong>Start</strong> to begin the dictation
                    </p>
                  </div>
                )}

                {phase === "running" && currentWord && (
                  <div>
                    <div
                      className="display-3 fw-bold mb-3 text-primary"
                      style={{ letterSpacing: "0.1em" }}
                    >
                      {currentWord}
                    </div>
                    <div className="mb-3">
                      <div className="progress" style={{ height: "10px" }}>
                        <div
                          className="progress-bar progress-bar-striped progress-bar-animated bg-primary"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                      <small className="text-muted mt-1 d-block">
                        {progress.done} of {progress.total}
                      </small>
                    </div>
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => speak(currentWord)}
                    >
                      🔊 Repeat word
                    </button>
                  </div>
                )}

                {phase === "success" && (
                  <div>
                    <div className="display-1 mb-2">🎉</div>
                    <h2 className="fw-bold text-success mb-2">Success!</h2>
                    <p className="text-muted">All words completed! Restarting in a moment…</p>
                  </div>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="d-flex gap-3 justify-content-center flex-wrap">
              <button
                className="btn btn-primary btn-lg px-4"
                onClick={handleStart}
                disabled={phase === "running"}
              >
                ▶ Start
              </button>
              <button
                className="btn btn-success btn-lg px-4"
                onClick={handleNext}
                disabled={phase !== "running"}
              >
                ⏭ Next
              </button>
              <button
                className="btn btn-danger btn-lg px-4"
                onClick={handleReset}
              >
                ↺ Reset
              </button>
            </div>

            {/* Blurred queue preview */}
            {phase === "running" && queue.length > 0 && (
              <div className="mt-4">
                <div className="card border-0 bg-light">
                  <div className="card-body">
                    <p className="text-muted small mb-2 fw-bold">REMAINING WORDS (hidden)</p>
                    <div className="d-flex flex-wrap gap-2 mb-1">
                      {queue.map((w, i) => (
                        <span
                          key={i}
                          className="badge bg-secondary"
                          style={{ filter: "blur(4px)", userSelect: "none" }}
                        >
                          {w}
                        </span>
                      ))}
                    </div>
                    <small className="text-muted">{queue.length} word(s) remaining</small>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      <footer className="text-center text-muted py-3 small border-top">
        Dictation App · Powered by Web Speech API · &copy; {new Date().getFullYear()} Jose L. Ulloa
      </footer>
    </div>
  );
}
