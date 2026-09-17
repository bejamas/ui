#!/usr/bin/env python3
"""Compare public/Worker response times. Run from the repository root.

python3 apps/web/scripts/diagnose-cloudflare.py --rounds 3 --timeout 20
Only GETs public endpoints. Reports headers and timings, never cookies or bodies.
"""
import argparse
import concurrent.futures
import json
import subprocess
from datetime import datetime, timezone

ORIGINS = ("https://ui.bejamas.com", "https://bejamas-ui.bejamas-oss.workers.dev")
PATHS = ("/", "/r/themes/current-theme.css", "/api/shuffles")


def probe(origin, path, timeout):
    result = subprocess.run(
        ["curl", "--silent", "--show-error", "--compressed", "--max-time", str(timeout),
         "--output", "/dev/null", "--write-out", "%{json}", origin + path],
        capture_output=True, text=True, timeout=timeout + 5,
    )
    timing = json.loads(result.stdout)
    return {
        "url": origin + path,
        "status": timing["http_code"],
        "dns_ms": round(timing["time_namelookup"] * 1000, 1),
        "tls_ms": round(timing["time_appconnect"] * 1000, 1),
        "ttfb_ms": round(timing["time_starttransfer"] * 1000, 1),
        "total_ms": round(timing["time_total"] * 1000, 1),
        "download_bytes": timing["size_download"],
        "curl_exit": result.returncode,
        "error": result.stderr.strip() or None,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--rounds", type=int, default=3)
    parser.add_argument("--timeout", type=int, default=20)
    args = parser.parse_args()
    if not 1 <= args.rounds <= 10 or not 1 <= args.timeout <= 60:
        parser.error("rounds must be 1–10 and timeout 1–60 seconds")
    print(json.dumps({"started_at": datetime.now(timezone.utc).isoformat()}), flush=True)
    # Compare each public request with its direct-upstream counterpart.
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        for round_number in range(1, args.rounds + 1):
            for path in PATHS:
                futures = [pool.submit(probe, origin, path, args.timeout) for origin in ORIGINS]
                for future in futures:
                    print(json.dumps({"round": round_number, **future.result()}), flush=True)


if __name__ == "__main__":
    main()
