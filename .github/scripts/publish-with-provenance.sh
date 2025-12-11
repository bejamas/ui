#!/usr/bin/env bash
set -euo pipefail

# This script assumes versions are already bumped by the merged "Version Packages" PR.
# DO NOT call `changeset version` here.

# Build fresh artifacts
bun install
bun run build:packages

cd packages
shopt -s nullglob
published_any=false

for dir in */ ; do
  pkg="${dir}package.json"
  [[ -f "$pkg" ]] || continue

  if [[ "$(jq -r '.private // false' "$pkg")" == "true" ]]; then
    echo "⏭️  $(jq -r .name "$pkg") (private)"
    continue
  fi

  name=$(jq -r .name "$pkg")
  ver=$(jq -r .version "$pkg")

  # Skip if this exact version is already on npm
  if npm view "${name}@${ver}" version >/dev/null 2>&1; then
    echo "⏭️  ${name}@${ver} already published"
    continue
  fi

  echo "📦 Packing ${name}@${ver}…"
  (cd "$dir" && bun pm pack)
  base=$(sed -e 's/@//' -e 's/\//-/' <<< "$name")
  tarball="${dir}${base}-${ver}.tgz"
  [[ -f "$tarball" ]] || { echo "❌ Missing tarball $tarball"; exit 1; }

  echo "⬆️  Publishing ${name}@${ver} (latest, provenance)…"
  npm publish "$tarball" --access public --provenance
  published_any=true
done

if [[ "$published_any" == "false" ]]; then
  echo "✅ Nothing to publish (all versions already on npm)."
fi