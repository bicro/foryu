import { stats } from "@/lib/data";

export function Methodology() {
  return (
    <section id="methodology" className="border-b border-rule">
      <div className="mx-auto max-w-3xl px-5 py-12">
        <h2 className="text-xs uppercase tracking-[0.2em] text-muted font-mono tabular">
          methodology
        </h2>
        <h3 className="mt-3 text-2xl sm:text-3xl font-semibold tracking-tight">
          Live two-hop graph expansion. Cosine in your browser.
        </h3>

        <div className="mt-5 space-y-4 text-[15px] leading-relaxed text-zinc-700">
          <p>
            The only data file we ship is{" "}
            <a
              href="/vocab.json"
              className="font-mono text-foreground underline decoration-rule underline-offset-4 hover:text-accent"
            >
              vocab.json
            </a>{" "}
            — the {(stats.vocab_size / 1000).toFixed(0)}k most-liked Hugging
            Face models, their like-counts, and an IDF score used for
            weighting. Everything else (your input, the candidate search, the
            ranking) runs live in your browser.
          </p>
          <p>
            When you submit a username, your browser fetches their likes from
            the public HF API, takes their most distinctive ones, follows the
            graph two hops out (likers of those models, then those likers&apos;
            full likes), and ranks the results by cosine similarity to your
            taste vector. About 70 API calls, 5–15 seconds, none of them ours.
            That&apos;s the whole trick.
          </p>
          <p className="text-sm text-muted">
            <span className="font-semibold text-zinc-700">Caveats:</span> HF
            likes are bookmarks as much as endorsements, so similarity reflects
            shared attention, not shared opinion. We sample only the first page
            of likers per model, biasing toward recent fans of popular things —
            IDF weighting partially corrects. Datasets and Spaces are excluded.
            If your likes don&apos;t intersect the vocab at all, the recommender
            bails.
          </p>
        </div>
      </div>
    </section>
  );
}
