import { stats } from "@/lib/data";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-rule bg-white">
      <div className="mx-auto max-w-3xl px-5 py-10 text-sm text-muted space-y-3">
        <p>
          Built in a weekend. Follow{" "}
          <a
            href="https://x.com/bicro_"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground font-medium underline decoration-accent underline-offset-4 hover:text-accent"
          >
            @bicro_
          </a>{" "}
          on X for more interesting experiments.
        </p>
        <p className="font-mono text-xs">
          <a
            href="https://github.com/bicro/foryu"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-rule underline-offset-4 hover:text-accent"
          >
            source
          </a>
          <span className="mx-2 text-rule">·</span>
          <a
            href="/vocab.json"
            className="underline decoration-rule underline-offset-4 hover:text-accent"
          >
            vocab.json
          </a>
          <span className="mx-2 text-rule">·</span>
          <span>
            {stats.vocab_size.toLocaleString()}-model IDF vocab, refreshed{" "}
            {new Date(stats.computed_at).toLocaleDateString()}
          </span>
        </p>
        <p className="text-xs">
          Not affiliated with Hugging Face. Lookups happen in your browser;
          no server we operate ever sees your input.
        </p>
      </div>
    </footer>
  );
}
