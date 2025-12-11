#!/usr/bin/env bash
set -euo pipefail

bun install
bun run build:packages

cd packages
shopt -s nullglob
for dir in */ ; do
  pkg="${dir}package.json"
  [[ -f "$pkg" ]] || continue

  if [[ "$(jq -r '.private // false' "$pkg")" == "true" ]]; then
    echo "⏭️  $(jq -r .name "$pkg") (private)"; continue
  fi

  name=$(jq -r .name "$pkg")
  ver=$(jq -r .version "$pkg")

  # Skip if already on npm (idempotent)
  if npm view "${name}@${ver}" version >/dev/null 2>&1; then
    echo "⏭️  ${name}@${ver} already published"; continue
  fi

  echo "📦 Packing ${name}@${ver}…"
  (cd "$dir" && bun pm pack >/dev/null)

  # Find the tarball that pack just created
  # For @scope/pkg → scope-pkg-VER.tgz ; for unscoped → pkg-VER.tgz
  base="$(sed -e 's/@//' -e 's/\//-/' <<< "$name")"
  tarball_candidate="${dir}${base}-${ver}.tgz"

  # If the computed name isn’t there, just glob for *.tgz in the package dir
  if [[ ! -f "$tarball_candidate" ]]; then
    tarball_candidate="$(ls -1 "${dir}"*.tgz | head -n1 || true)"
  fi

  [[ -f "$tarball_candidate" ]] || { echo "❌ Tarball not found for $name@$ver"; exit 1; }

  echo "⬆️  Publishing ${name}@${ver} (latest, provenance)…"
  npm publish "./$tarball_candidate" --access public --provenance
done