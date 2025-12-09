#!/usr/bin/env bash
set -euo pipefail

# Apply versions from the "Version Packages" commit
bunx changeset version

# Rebuild with bumped versions
bun run build:packages

# Pack & publish each public package with provenance
cd packages
for dir in */; do
  pkg="$dir/package.json"
  [ -f "$pkg" ] || continue
  if [ "$(jq -r '.private // false' "$pkg")" != "true" ]; then
    (cd "$dir" && bun pm pack)
    name=$(jq -r '.name' "$pkg" | sed 's/@//; s/\//-/g')
    ver=$(jq -r '.version' "$pkg")
    npm publish "$dir/$name-$ver.tgz" --provenance --access public
  fi
done