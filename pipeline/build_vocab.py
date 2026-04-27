"""Build the IDF vocab for the live recommender.

Fetches the top N HF models by likes count, computes IDF based on those
counts (relative to a fixed user-base assumption), and writes
web/public/vocab.json — the only artifact the static site needs to ship.

Vocab shape (compact, gzip-friendly):
  {
    "n_users": 100000,    // assumed user base for IDF normalization
    "models": [
      {"id": "...", "likes": 12345, "idf": 0.42},
      ...                  // sorted by likes desc, top VOCAB_SIZE entries
    ]
  }

Run it as often as you want — it's a single network burst (~50 calls).
No HF token required (public endpoint), but a token bumps rate limits.
"""
from __future__ import annotations

import json
import os
import sys
import time
from math import log
from pathlib import Path

import requests
from tqdm import tqdm

VOCAB_SIZE = 10_000
PAGE_SIZE = 1_000
ASSUMED_USER_BASE = 100_000  # HF active-likers ballpark for IDF normalization
WEB_PUBLIC = Path(__file__).parent.parent / "web" / "public"

session = requests.Session()
if (token := os.getenv("HF_TOKEN")):
    session.headers["Authorization"] = f"Bearer {token}"
session.headers["User-Agent"] = "foryu.me/0.1 (+https://foryu.me)"


def parse_next_link(link_header: str) -> str | None:
    """Pull the rel="next" URL out of an RFC5988 Link header."""
    for part in link_header.split(","):
        if 'rel="next"' in part:
            seg = part.split(";")[0].strip()
            return seg.strip("<>")
    return None


def fetch(url: str, params: dict | None = None) -> requests.Response:
    """GET with backoff. Returns the Response so caller can read Link header."""
    for attempt in range(5):
        r = session.get(url, params=params, timeout=30)
        if r.status_code == 200:
            return r
        if r.status_code == 429:
            time.sleep(60)
            continue
        if r.status_code >= 500:
            time.sleep(2 ** attempt)
            continue
        r.raise_for_status()
    raise RuntimeError(f"failed: {url}")


def main() -> int:
    rows: list[dict] = []
    url: str | None = "https://huggingface.co/api/models"
    params: dict | None = {"sort": "likes", "direction": -1, "limit": PAGE_SIZE}
    pbar = tqdm(total=VOCAB_SIZE, desc="fetching top models")
    while url and len(rows) < VOCAB_SIZE:
        r = fetch(url, params)
        chunk = r.json()
        if not chunk:
            break
        rows.extend(chunk)
        pbar.update(len(chunk))
        url = parse_next_link(r.headers.get("Link", ""))
        params = None  # subsequent calls use the full URL from Link
    pbar.close()
    rows = rows[:VOCAB_SIZE]
    rows = [r for r in rows if r.get("likes", 0) > 0]

    n = ASSUMED_USER_BASE
    out = {
        "n_users": n,
        "models": [
            {
                "id": r["id"],
                "likes": int(r["likes"]),
                "idf": round(log(n / max(1, int(r["likes"]))), 4),
            }
            for r in rows
        ],
    }

    WEB_PUBLIC.mkdir(parents=True, exist_ok=True)
    target = WEB_PUBLIC / "vocab.json"
    target.write_text(json.dumps(out, separators=(",", ":")))
    size_kb = target.stat().st_size / 1024
    print(f"wrote {target} — {len(out['models'])} models, {size_kb:.1f} KB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
