"use client";

import { useMemo, useState } from "react";

type Phase = "listen" | "meaning" | "dispatch" | "result";

type Handler = {
  name: string;
  role: string;
  result: string;
  action: string;
};

type Scenario = {
  id: string;
  label: string;
  prompt: string;
  meaning: string;
  intent: string;
  handlers: Handler[];
  heard: string[];
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

const SCENARIOS: Scenario[] = [
  {
    id: "cafe",
    label: "Quiet cafes",
    prompt: "Find three quiet cafes near me with wifi.",
    meaning: "You want quiet nearby cafes with reliable wifi.",
    intent: "whoelse.local.cafe.find",
    handlers: [
      {
        name: "Maps",
        role: "platform",
        result: "3 walkable cafes open now",
        action: "View",
      },
      {
        name: "Review AI",
        role: "agent",
        result: "filters out noisy spots",
        action: "Compare",
      },
      {
        name: "Cafe site",
        role: "web",
        result: "menus and tables ready",
        action: "Reserve",
      },
    ],
    heard: [
      "Find three quiet cafes near me with wifi.",
      "Find free quiet cafes nearby with Wi-Fi.",
      "Find three quiet coffee places near me with wireless.",
    ],
  },
  {
    id: "dentist",
    label: "Dentist",
    prompt: "Book me a dentist next week who takes my insurance.",
    meaning: "You want a dentist appointment next week that accepts your insurance.",
    intent: "whoelse.health.dentist.book",
    handlers: [
      {
        name: "Provider search",
        role: "platform",
        result: "6 dentists match insurance",
        action: "See times",
      },
      {
        name: "Calendar",
        role: "app",
        result: "Tuesday and Thursday open",
        action: "Pick",
      },
      {
        name: "Office",
        role: "human",
        result: "call only if needed",
        action: "Confirm",
      },
    ],
    heard: [
      "Book me a dentist next week who takes my insurance.",
      "Find me a dentist next week that takes my insurance.",
      "Book a dental appointment next week with insurance.",
    ],
  },
  {
    id: "late",
    label: "Late reply",
    prompt: "Draft a reply telling Sam I'll be 10 minutes late.",
    meaning: "You want to tell Sam you will arrive 10 minutes late.",
    intent: "whoelse.message.reply.late",
    handlers: [
      {
        name: "Contacts",
        role: "app",
        result: "Sam found",
        action: "Open",
      },
      {
        name: "Writing AI",
        role: "agent",
        result: "short polite reply drafted",
        action: "Edit",
      },
      {
        name: "Messages",
        role: "platform",
        result: "ready to send",
        action: "Send",
      },
    ],
    heard: [
      "Draft a reply telling Sam I'll be 10 minutes late.",
      "Draft reply to Sam I will be ten minutes late.",
      "Tell Sam I'm running about 10 minutes late.",
    ],
  },
];

function inferScenario(value: string) {
  const lower = value.toLowerCase();
  if (lower.includes("dentist") || lower.includes("insurance")) return SCENARIOS[1];
  if (lower.includes("sam") || lower.includes("late") || lower.includes("reply")) return SCENARIOS[2];
  return SCENARIOS[0];
}

function nextPhase(phase: Phase): Phase {
  if (phase === "listen") return "meaning";
  if (phase === "meaning") return "dispatch";
  if (phase === "dispatch") return "result";
  return "listen";
}

function ctaLabel(phase: Phase) {
  if (phase === "listen") return "Understand";
  if (phase === "meaning") return "Looks right";
  if (phase === "dispatch") return "Run it";
  return "Ask again";
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [phase, setPhase] = useState<Phase>("listen");
  const [scenario, setScenario] = useState<Scenario>(SCENARIOS[0]);
  const [listening, setListening] = useState(false);
  const [notice, setNotice] = useState("");

  const shownHandlers = useMemo(() => {
    if (phase === "dispatch") return scenario.handlers;
    if (phase === "result") return scenario.handlers;
    return [];
  }, [phase, scenario.handlers]);

  function start(value = query) {
    const clean = value.trim();
    if (!clean) return;
    setScenario(inferScenario(clean));
    setQuery(clean);
    setPhase("meaning");
    setNotice("");
  }

  function advance() {
    if (phase === "listen") {
      start();
      return;
    }

    const next = nextPhase(phase);
    setPhase(next);
    if (next === "listen") {
      setQuery("");
      setNotice("");
    }
  }

  function useExample(example: Scenario) {
    setQuery(example.prompt);
    setScenario(example);
    setPhase("meaning");
    setNotice("");
  }

  function speak() {
    const speechWindow = window as Window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const SpeechRecognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setNotice("Voice is not available here. Typing works the same way.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript || "";
      if (transcript) start(transcript);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => {
      setListening(false);
      setNotice("Voice stopped. Try typing it instead.");
    };
    setListening(true);
    recognition.start();
  }

  return (
    <main className="min-h-screen bg-[#f8f7f2] text-slate-950">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between">
          <div className="text-lg font-black tracking-tight">WhoElse</div>
          <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-500">
            Say it once
          </div>
        </header>

        <section className="grid flex-1 items-center gap-8 py-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">Consumer prototype</p>
            <h1 className="mt-4 max-w-xl text-5xl font-semibold leading-[0.98] tracking-normal sm:text-7xl">
              Say it once. It gets done.
            </h1>
            <p className="mt-5 max-w-md text-lg leading-8 text-slate-600">
              Different AIs can hear different words. WhoElse keeps the meaning.
            </p>

            <div className="mt-8 rounded-[28px] border border-slate-200 bg-white p-2 shadow-xl shadow-slate-200/70">
              <div className="flex items-center gap-2 rounded-[22px] bg-slate-50 p-2">
                <button
                  onClick={speak}
                  aria-label="Speak"
                  title="Speak"
                  className={`h-12 w-12 shrink-0 rounded-full border text-sm font-black transition ${
                    listening
                      ? "border-rose-300 bg-rose-500 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-400"
                  }`}
                >
                  Mic
                </button>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && start()}
                  placeholder="Speak or type..."
                  className="min-w-0 flex-1 bg-transparent px-2 text-base font-medium outline-none placeholder:text-slate-400"
                />
                <button
                  onClick={advance}
                  className="h-12 shrink-0 rounded-full bg-slate-950 px-5 text-sm font-bold text-white hover:bg-slate-800"
                >
                  {ctaLabel(phase)}
                </button>
              </div>
              {notice && <div className="px-4 py-2 text-sm text-slate-500">{notice}</div>}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {SCENARIOS.map((example) => (
                <button
                  key={example.id}
                  onClick={() => useExample(example)}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-950"
                >
                  {example.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-200/80 sm:p-5">
            {phase === "listen" && (
              <div className="grid min-h-[460px] place-items-center rounded-[24px] bg-slate-50 p-8 text-center">
                <div>
                  <div className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-full bg-white text-sm font-black text-slate-400 shadow-sm">
                    1
                  </div>
                  <h2 className="text-3xl font-semibold">One request.</h2>
                  <p className="mt-3 max-w-sm text-slate-500">No app picking. No search again. No special wording.</p>
                </div>
              </div>
            )}

            {phase !== "listen" && (
              <div className="space-y-4">
                <section className="rounded-[24px] bg-slate-950 p-5 text-white">
                  <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Meaning</div>
                  <div className="mt-3 text-2xl font-semibold leading-8">{scenario.meaning}</div>
                  <div className="mt-4 inline-flex rounded-full bg-white/10 px-3 py-1 font-mono text-xs font-bold text-slate-300">
                    {scenario.intent}
                  </div>
                </section>

                {shownHandlers.length > 0 && (
                  <section className="grid gap-3 sm:grid-cols-3">
                    {shownHandlers.map((handler) => (
                      <div key={handler.name} className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-bold">{handler.name}</div>
                          <div className="rounded-full bg-white px-2 py-1 text-[10px] font-black uppercase text-slate-400">
                            {handler.role}
                          </div>
                        </div>
                        <p className="mt-8 text-sm leading-5 text-slate-500">
                          {phase === "result" ? handler.result : "Ready"}
                        </p>
                        <button className="mt-4 w-full rounded-full bg-white px-3 py-2 text-sm font-bold text-slate-700 shadow-sm">
                          {handler.action}
                        </button>
                      </div>
                    ))}
                  </section>
                )}

                {phase === "result" && (
                  <section className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-5">
                    <div className="text-sm font-bold text-emerald-800">Done enough to continue.</div>
                    <p className="mt-2 text-sm leading-6 text-emerald-900">
                      The user can pick an option, edit the request, or hand off to the service.
                    </p>
                  </section>
                )}

                <details className="rounded-[24px] border border-slate-200 bg-white p-4">
                  <summary className="cursor-pointer text-sm font-bold text-slate-500">Under the hood</summary>
                  <div className="mt-4 grid gap-2">
                    {scenario.heard.map((item, index) => (
                      <div key={item} className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">
                        AI {index + 1}: "{item}"
                      </div>
                    ))}
                    <div className="rounded-2xl bg-slate-950 p-3 font-mono text-xs font-bold text-white">
                      3 wordings - 1 shared meaning - dispatched
                    </div>
                  </div>
                </details>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
