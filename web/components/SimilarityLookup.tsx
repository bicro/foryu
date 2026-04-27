"use client";

import { useRef, useState } from "react";
import type { Vocab } from "@/lib/data";
import { SimilarityResultCard } from "./SimilarityResultCard";

const TOP_N_RESULTS = 10; // shown on the page
const TOP_N_SCREENSHOT = 5; // baked into the downloadable image
const DISTINCTIVE_LIKES = 20; // top-IDF likes of input user used as seed
const TOP_CANDIDATES = 50; // candidates we fully cosine-rank
const FETCH_CONCURRENCY = 8; // parallel HF API calls

const HF = (path: string) => `https://huggingface.co${path}`;

export type Match = {
  username: string;
  fullname?: string;
  avatarUrl?: string;
  num_likes: number;
  score: number;
  shared: string[]; // model IDs shared with input, sorted by IDF desc
};

type VocabIndex = {
  vocab: Vocab;
  idfByModel: Map<string, number>;
};

let vocabCache: VocabIndex | null = null;

async function loadVocab(): Promise<VocabIndex> {
  if (vocabCache) return vocabCache;
  const r = await fetch("/vocab.json");
  if (!r.ok) throw new Error("vocab_load_failed");
  const vocab: Vocab = await r.json();
  const idfByModel = new Map<string, number>();
  for (const m of vocab.models) idfByModel.set(m.id, m.idf);
  vocabCache = { vocab, idfByModel };
  return vocabCache;
}

type HFLike = { repo: { name: string; type: string } };

async function fetchUserLikes(username: string): Promise<string[]> {
  const r = await fetch(HF(`/api/users/${encodeURIComponent(username)}/likes`));
  if (r.status === 404) throw new Error("not_found");
  if (!r.ok) throw new Error("hf_error");
  const data: HFLike[] = await r.json();
  return data.filter((d) => d.repo?.type === "model").map((d) => d.repo.name);
}

type Liker = { user: string; fullname?: string; avatarUrl?: string };

async function fetchFirstPageLikers(modelId: string): Promise<Liker[]> {
  const r = await fetch(HF(`/api/models/${modelId}/likers?limit=50`));
  if (!r.ok) return [];
  return await r.json();
}

async function batchedMap<T, R>(
  items: T[],
  concurrency: number,
  fn: (t: T, i: number) => Promise<R>,
  onProgress?: (done: number, total: number) => void,
): Promise<(R | null)[]> {
  const results: (R | null)[] = new Array(items.length).fill(null);
  let next = 0;
  let done = 0;
  await Promise.all(
    Array(Math.min(concurrency, items.length))
      .fill(0)
      .map(async () => {
        while (true) {
          const i = next++;
          if (i >= items.length) return;
          try {
            results[i] = await fn(items[i], i);
          } catch {
            // null left in place; caller ignores
          }
          done++;
          onProgress?.(done, items.length);
        }
      }),
  );
  return results;
}

function buildVector(modelIds: string[], idf: Map<string, number>): {
  weights: Map<string, number>;
  norm: number;
} {
  const weights = new Map<string, number>();
  let normSq = 0;
  for (const m of modelIds) {
    const w = idf.get(m);
    if (w === undefined) continue;
    weights.set(m, w);
    normSq += w * w;
  }
  return { weights, norm: Math.sqrt(normSq) };
}

function cosine(
  a: { weights: Map<string, number>; norm: number },
  b: { weights: Map<string, number>; norm: number },
): { score: number; shared: string[] } {
  if (a.norm === 0 || b.norm === 0) return { score: 0, shared: [] };
  const small = a.weights.size <= b.weights.size ? a : b;
  const large = small === a ? b : a;
  let dot = 0;
  const shared: string[] = [];
  for (const [m, w] of small.weights) {
    const v = large.weights.get(m);
    if (v !== undefined) {
      dot += w * v;
      shared.push(m);
    }
  }
  return { score: dot / (a.norm * b.norm), shared };
}

type Phase =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "fetching_likes" }
  | { kind: "scanning"; done: number; total: number }
  | { kind: "ranking"; done: number; total: number }
  | {
      kind: "result";
      username: string;
      matches: Match[];
      userLikes: number;
      vocabHits: number;
      fallback: boolean;
    }
  | { kind: "error"; message: string };

export function SimilarityLookup() {
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const cardRef = useRef<HTMLDivElement>(null);
  const [copyState, setCopyState] = useState<"idle" | "copying" | "done" | "fail">("idle");
  const [downloadState, setDownloadState] = useState<"idle" | "rendering" | "done" | "fail">("idle");

  const busy =
    phase.kind === "loading" ||
    phase.kind === "fetching_likes" ||
    phase.kind === "scanning" ||
    phase.kind === "ranking";

  async function runLookup(username: string) {
    const u = username.trim().replace(/^@/, "");
    if (!u) return;
    setInput(u);
    setCopyState("idle");

    try {
      setPhase({ kind: "loading" });
      const { idfByModel } = await loadVocab();

      setPhase({ kind: "fetching_likes" });
      const likes = await fetchUserLikes(u);
      const inputModels = likes.filter((m) => idfByModel.has(m));
      const queryVec = buildVector(inputModels, idfByModel);

      if (queryVec.norm === 0) {
        setPhase({
          kind: "result",
          username: u,
          matches: [],
          userLikes: likes.length,
          vocabHits: 0,
          fallback: true,
        });
        return;
      }

      const distinctive = inputModels
        .map((m) => ({ m, idf: idfByModel.get(m)! }))
        .sort((a, b) => b.idf - a.idf)
        .slice(0, DISTINCTIVE_LIKES);

      setPhase({ kind: "scanning", done: 0, total: distinctive.length });
      const likersBySeed = await batchedMap(
        distinctive,
        FETCH_CONCURRENCY,
        (d) => fetchFirstPageLikers(d.m),
        (done, total) => setPhase({ kind: "scanning", done, total }),
      );

      const quick = new Map<string, { score: number; meta: Liker }>();
      for (let i = 0; i < distinctive.length; i++) {
        const w = distinctive[i].idf;
        const likers = likersBySeed[i];
        if (!likers) continue;
        for (const liker of likers) {
          if (!liker.user || liker.user.toLowerCase() === u.toLowerCase()) continue;
          const cur = quick.get(liker.user);
          if (cur) cur.score += w;
          else quick.set(liker.user, { score: w, meta: liker });
        }
      }

      const topQuick = [...quick.entries()]
        .sort((a, b) => b[1].score - a[1].score)
        .slice(0, TOP_CANDIDATES);

      if (topQuick.length === 0) {
        setPhase({
          kind: "result",
          username: u,
          matches: [],
          userLikes: likes.length,
          vocabHits: inputModels.length,
          fallback: true,
        });
        return;
      }

      setPhase({ kind: "ranking", done: 0, total: topQuick.length });
      const candidateLikes = await batchedMap(
        topQuick,
        FETCH_CONCURRENCY,
        ([username]) => fetchUserLikes(username),
        (done, total) => setPhase({ kind: "ranking", done, total }),
      );

      const matches: Match[] = [];
      for (let i = 0; i < topQuick.length; i++) {
        const [username, { meta }] = topQuick[i];
        const cLikes = candidateLikes[i];
        if (!cLikes || cLikes.length === 0) continue;
        const cModels = cLikes.filter((m) => idfByModel.has(m));
        const cVec = buildVector(cModels, idfByModel);
        const { score, shared } = cosine(queryVec, cVec);
        if (score <= 0) continue;
        const sortedShared = [...shared].sort(
          (a, b) => idfByModel.get(b)! - idfByModel.get(a)!,
        );
        matches.push({
          username,
          fullname: meta.fullname,
          avatarUrl: meta.avatarUrl,
          num_likes: cLikes.length,
          score,
          shared: sortedShared,
        });
      }

      matches.sort((a, b) => b.score - a.score);

      setPhase({
        kind: "result",
        username: u,
        matches: matches.slice(0, TOP_N_RESULTS),
        userLikes: likes.length,
        vocabHits: inputModels.length,
        fallback: matches.length === 0,
      });
    } catch (err) {
      const msg =
        err instanceof Error && err.message === "not_found"
          ? `No Hugging Face account at @${u}.`
          : err instanceof Error && err.message === "vocab_load_failed"
            ? "Couldn't load vocab.json."
            : "Couldn't reach the Hugging Face API. Try again.";
      setPhase({ kind: "error", message: msg });
    }
  }

  async function copyAsImage() {
    if (!cardRef.current) return;
    setCopyState("copying");
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
      });
      const blob = await (await fetch(dataUrl)).blob();
      if (
        navigator.clipboard &&
        "write" in navigator.clipboard &&
        typeof ClipboardItem !== "undefined"
      ) {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);
        setCopyState("done");
      } else {
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download =
          phase.kind === "result"
            ? `foryu-${phase.username}.png`
            : "foryu-card.png";
        a.click();
        setCopyState("done");
      }
    } catch (err) {
      console.error(err);
      setCopyState("fail");
    }
    setTimeout(() => setCopyState("idle"), 2500);
  }

  async function downloadImage() {
    if (!cardRef.current) return;
    setDownloadState("rendering");
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download =
        phase.kind === "result"
          ? `foryu-${phase.username}.png`
          : "foryu-card.png";
      a.click();
      setDownloadState("done");
    } catch (err) {
      console.error(err);
      setDownloadState("fail");
    }
    setTimeout(() => setDownloadState("idle"), 2500);
  }

  return (
    <section id="lookup" className="border-b border-rule">
      <div className="mx-auto max-w-3xl px-5 pb-16 sm:pb-20">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            runLookup(input);
          }}
          className="flex flex-wrap gap-2"
        >
          <div className="flex-1 min-w-[200px] flex items-stretch border border-rule bg-white focus-within:border-foreground transition-colors">
            <span className="pl-4 pr-2 flex items-center text-muted font-mono text-base">
              @
            </span>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="huggingface-username"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              disabled={busy}
              className="flex-1 bg-transparent py-4 pr-4 outline-none font-mono tabular text-base disabled:opacity-50"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="px-6 py-4 bg-foreground text-background text-base font-medium hover:bg-accent transition-colors disabled:opacity-50"
          >
            find matches
          </button>
        </form>

        {phase.kind === "idle" && (
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted">
            <span className="font-mono tabular">try:</span>
            {["bicro", "merve", "julien-c"].map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => runLookup(u)}
                className="font-mono tabular text-muted underline decoration-rule underline-offset-4 hover:text-accent"
              >
                @{u}
              </button>
            ))}
          </div>
        )}

        {busy && <ProgressLine phase={phase} />}

        {phase.kind === "error" && (
          <p className="mt-6 text-sm text-accent font-mono">{phase.message}</p>
        )}

        {phase.kind === "result" && (
          <div className="mt-8 space-y-4">
            {phase.matches.length > 0 ? (
              <>
                <SimilarityResultCard
                  inputUsername={phase.username}
                  matches={phase.matches}
                  fallback={phase.fallback}
                />
                <div
                  aria-hidden
                  style={{
                    position: "absolute",
                    left: "-10000px",
                    top: 0,
                    width: "640px",
                    pointerEvents: "none",
                  }}
                >
                  <SimilarityResultCard
                    ref={cardRef}
                    inputUsername={phase.username}
                    matches={phase.matches.slice(0, TOP_N_SCREENSHOT)}
                    fallback={phase.fallback}
                  />
                </div>
                <p className="text-xs text-muted">
                  Computed from {phase.vocabHits} of @{phase.username}&apos;s{" "}
                  {phase.userLikes} model-likes (the rest aren&apos;t in our
                  10k-model vocab).
                </p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  <button
                    type="button"
                    onClick={downloadImage}
                    disabled={downloadState === "rendering"}
                    className="font-mono text-foreground font-semibold underline decoration-accent underline-offset-4 hover:text-accent disabled:opacity-50"
                  >
                    {downloadState === "idle" && "↓ download image"}
                    {downloadState === "rendering" && "rendering…"}
                    {downloadState === "done" && "downloaded ✓"}
                    {downloadState === "fail" && "download failed"}
                  </button>
                  <span className="text-rule">·</span>
                  <button
                    type="button"
                    onClick={copyAsImage}
                    disabled={copyState === "copying"}
                    className="font-mono text-muted underline decoration-rule underline-offset-4 hover:text-accent disabled:opacity-50"
                  >
                    {copyState === "idle" && "copy as png"}
                    {copyState === "copying" && "rendering…"}
                    {copyState === "done" && "copied"}
                    {copyState === "fail" && "copy failed"}
                  </button>
                  <span className="text-rule">·</span>
                  <a
                    href={`https://huggingface.co/${phase.username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-muted underline decoration-rule underline-offset-4 hover:text-accent"
                  >
                    hf profile
                  </a>
                </div>
                <div className="mt-3 inline-flex items-center gap-3 px-3 py-2 border border-rule bg-white text-sm">
                  <span className="text-zinc-700">
                    Found this useful? Follow the maker on X.
                  </span>
                  <a
                    href="https://x.com/bicro_"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-foreground font-semibold underline decoration-accent underline-offset-4 hover:text-accent whitespace-nowrap"
                  >
                    @bicro_ ↗
                  </a>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted">
                We couldn&apos;t find matches for @{phase.username} — they have{" "}
                {phase.userLikes} likes but{" "}
                {phase.vocabHits === 0
                  ? "none are in our 10k-model vocab. Like a few popular models on Hugging Face and try again."
                  : "the seed candidates didn't pan out. Rare; try again."}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function ProgressLine({ phase }: { phase: Phase }) {
  let label = "";
  let pct: number | null = null;
  if (phase.kind === "loading") label = "loading vocab…";
  else if (phase.kind === "fetching_likes") label = "fetching their likes…";
  else if (phase.kind === "scanning") {
    label = `scanning likers… ${phase.done}/${phase.total}`;
    pct = phase.total ? (phase.done / phase.total) * 100 : null;
  } else if (phase.kind === "ranking") {
    label = `ranking candidates… ${phase.done}/${phase.total}`;
    pct = phase.total ? (phase.done / phase.total) * 100 : null;
  }
  return (
    <div className="mt-6">
      <p className="text-xs text-muted font-mono tabular">{label}</p>
      {pct !== null && (
        <div className="mt-2 h-0.5 w-full bg-stone-200 overflow-hidden">
          <div
            className="h-full bg-accent transition-[width] duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}
