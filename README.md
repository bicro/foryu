# foryu.me

A static site that finds your ML twins on Hugging Face. Type your handle,
get the five HF users whose taste overlaps yours the most. Live, in your
browser, no backend.

How it works in one paragraph: we ship a single static `vocab.json` (top
~10k HF models with their like-counts, used for IDF weighting). When you
submit a username, the browser fetches that user's likes from the public HF
API, follows the graph two hops out (likers of their most distinctive
likes, then those likers' full likes), and ranks the result by cosine
similarity. ~70 API calls per lookup, 5–15 seconds, zero servers we operate.

## Run it

```bash
# refresh the vocab (~5 seconds, no auth needed)
cd pipeline
uv sync
uv run python build_vocab.py

# run the site
cd ../web
pnpm install
pnpm dev    # http://localhost:3000
pnpm build  # static export to web/out/, deployable anywhere
```

## License

Code: MIT. Data shipped (`web/public/vocab.json`) is derived from public
Hugging Face model metadata.
