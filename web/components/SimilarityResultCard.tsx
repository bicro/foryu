"use client";

import Image from "next/image";
import { forwardRef } from "react";
import type { Match } from "./SimilarityLookup";

type Props = {
  inputUsername: string;
  matches: Match[];
  fallback: boolean;
};

function resolveAvatar(username: string, avatarUrl?: string): string {
  if (!avatarUrl) return `https://huggingface.co/api/users/${username}/avatar`;
  if (avatarUrl.startsWith("http://") || avatarUrl.startsWith("https://")) {
    return avatarUrl;
  }
  // HF returns relative paths like "/avatars/HASH.svg" for some accounts.
  return `https://huggingface.co${avatarUrl.startsWith("/") ? "" : "/"}${avatarUrl}`;
}

function shortModelId(m: string) {
  // "meta-llama/Llama-3.1-8B-Instruct" -> "Llama-3.1-8B-Instruct"
  const slash = m.lastIndexOf("/");
  return slash >= 0 ? m.slice(slash + 1) : m;
}

export const SimilarityResultCard = forwardRef<HTMLDivElement, Props>(
  function SimilarityResultCard({ inputUsername, matches, fallback }, ref) {
    return (
      <div
        ref={ref}
        className="border border-rule bg-white"
      >
        <div className="px-5 sm:px-7 py-5 border-b border-rule flex items-baseline justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted font-mono tabular">
              foryu.me
            </p>
            <p className="mt-1 text-base sm:text-lg font-semibold">
              {fallback ? (
                <>
                  Starting points for{" "}
                  <span className="font-mono tabular">@{inputUsername}</span>
                </>
              ) : (
                <>
                  Researchers like{" "}
                  <span className="font-mono tabular">@{inputUsername}</span>
                </>
              )}
            </p>
          </div>
          <p className="text-[10px] text-muted font-mono tabular text-right">
            cosine over
            <br />
            IDF likes
          </p>
        </div>

        <ol>
          {matches.map((m, i) => (
            <li
              key={m.username}
              className="border-b border-rule last:border-b-0"
            >
              <a
                href={`https://huggingface.co/${m.username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="grid grid-cols-[2rem_2.75rem_1fr_auto] gap-3 sm:gap-4 px-5 sm:px-7 py-4 items-center hover:bg-stone-50 focus-visible:bg-stone-50 outline-none transition-colors group"
              >
                <span className="text-base font-semibold tabular text-muted">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="relative w-11 h-11 overflow-hidden rounded-full bg-stone-200 ring-1 ring-rule">
                  <Image
                    src={resolveAvatar(m.username, m.avatarUrl)}
                    alt={m.username}
                    fill
                    sizes="44px"
                    className="object-cover"
                    unoptimized
                    crossOrigin="anonymous"
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate group-hover:text-accent transition-colors">
                    {m.fullname || m.username}{" "}
                    <span className="font-mono tabular text-muted text-xs ml-1 group-hover:text-muted">
                      @{m.username}
                    </span>
                    <span
                      aria-hidden
                      className="ml-1 text-xs text-muted group-hover:text-accent"
                    >
                      ↗
                    </span>
                  </p>
                  <p className="text-xs text-muted truncate mt-0.5">
                    {m.num_likes} likes
                    {m.shared.length > 0 && (
                      <>
                        {" · shared: "}
                        <span className="text-foreground">
                          {m.shared.slice(0, 2).map(shortModelId).join(", ")}
                        </span>
                        {m.shared.length > 2 && (
                          <span className="text-muted">
                            {" "}
                            +{m.shared.length - 2}
                          </span>
                        )}
                      </>
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold tabular">
                    {(m.score * 100).toFixed(0)}
                  </p>
                  <p className="text-[10px] text-muted font-mono tabular -mt-0.5">
                    match
                  </p>
                </div>
              </a>
            </li>
          ))}
        </ol>

        <div className="px-5 sm:px-7 py-3.5 font-mono tabular flex justify-between items-center bg-stone-50">
          <span className="text-sm font-bold text-foreground tracking-tight">
            foryu.me
          </span>
          <span className="text-[10px] text-muted">
            {matches.length} matches · cosine over IDF likes
          </span>
        </div>
      </div>
    );
  },
);
