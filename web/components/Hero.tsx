export function Hero() {
  return (
    <section>
      <div className="mx-auto max-w-3xl px-5 pt-16 pb-6 sm:pt-24 sm:pb-8">
        <h1 className="text-4xl sm:text-6xl font-semibold leading-[1.02] tracking-tight">
          Find your ML twins on Hugging Face.
        </h1>
        <p className="mt-5 text-lg sm:text-xl leading-relaxed text-zinc-700 max-w-2xl">
          Type your handle. We expand your taste-graph two hops out and rank
          the closest HF users by like-similarity, live in your browser.
          ~10 seconds. No backend.
        </p>
        <p className="mt-4 text-sm text-muted">
          a weekend project by{" "}
          <a
            href="https://x.com/bicro_"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground font-medium underline decoration-rule underline-offset-4 hover:text-accent"
          >
            @bicro_
          </a>{" "}
          — give it a follow on X if you like the tool
        </p>
      </div>
    </section>
  );
}
