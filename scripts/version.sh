#!/bin/bash
#
# version.sh — single source of truth for the BJJ Visualiser's semantic version.
#
# Two files carry the version and MUST agree (the script enforces this):
#   package.json       "version"          = MAJOR.MINOR.PATCH (semver)
#   app/version.json   "version" + "build" = the same semver + a monotonically increasing
#                                            build ("round") number, shown in the app footer.
#
# Rules (inherited from the ImmersiFit convention, 2026-07-17):
#   patch — bug fixes, copy fixes, knowledge-entry corrections (a wrong position/mechanism/source)
#   minor — new features, new technique entries, new regions/positions, schema ADDITIONS
#   major — breaking changes: knowledge schema breaks, rig joint renames (anything that makes
#           an older app/data pair invalid), or a repurpose of the product
#   docs-only never bumps.
# Every released version gets an annotated git tag vX.Y.Z at its commit, so any deployed
# state can be checked out (git checkout vX.Y.Z) or diffed against.
#
# Usage:
#   scripts/version.sh current            print version+build, verify both files aligned
#   scripts/version.sh verify             alignment + tag consistency report
#   scripts/version.sh bump patch|minor|major   bump semver + build number in BOTH files
#   scripts/version.sh set X.Y.Z          set an explicit version in BOTH files (always
#                                         increments the build; use to re-align a drifted tree)
#   scripts/version.sh tag                create annotated tag v<version> at HEAD
#
set -euo pipefail
cd "$(dirname "$0")/.."

P_PKG="package.json"
P_APP="app/version.json"

pkg_v=$(node -p "require('./$P_PKG').version")
app_v=$(node -p "require('./$P_APP').version")
app_b=$(node -p "require('./$P_APP').build")

require_aligned() {
  if [ "$pkg_v" != "$app_v" ]; then
    echo "MISALIGNED: package.json v$pkg_v vs app/version.json v$app_v (build $app_b)" >&2
    exit 1
  fi
}

write_all() { # $1 = version, $2 = build
  node -e "
    const fs = require('fs');
    const pkg = JSON.parse(fs.readFileSync('$P_PKG', 'utf8')); pkg.version = '$1';
    fs.writeFileSync('$P_PKG', JSON.stringify(pkg, null, 2) + '\n');
    fs.writeFileSync('$P_APP', JSON.stringify({ version: '$1', build: $2 }) + '\n');
  "
  local pv av ab
  pv=$(node -p "require('./$P_PKG').version")
  av=$(node -p "require('./$P_APP').version")
  ab=$(node -p "require('./$P_APP').build")
  if [ "$pv" != "$1" ] || [ "$av" != "$1" ] || [ "$ab" != "$2" ]; then
    echo "WRITE FAILED: wanted v$1 ($2), got package.json v$pv / app v$av ($ab)" >&2
    exit 1
  fi
  echo "both files -> v$1 (build $2)"
}

case "${1:-current}" in
  current)
    require_aligned
    echo "v$pkg_v ($app_b)"
    ;;
  verify)
    require_aligned
    echo "version:  v$pkg_v (build $app_b) — package.json and app/version.json aligned"
    latest_tag=$(git tag -l 'v*' --sort=-v:refname | head -1)
    echo "last tag: ${latest_tag:-none}"
    if [ "v$pkg_v" != "${latest_tag:-}" ]; then
      echo "note: working version v$pkg_v differs from last tag ${latest_tag:-none} (tag on release)"
    fi
    ;;
  bump)
    require_aligned
    IFS=. read -r MA MI PA <<< "$pkg_v"
    case "${2:?bump needs patch|minor|major}" in
      patch) PA=$((PA+1));;
      minor) MI=$((MI+1)); PA=0;;
      major) MA=$((MA+1)); MI=0; PA=0;;
      *) echo "unknown bump kind: $2" >&2; exit 1;;
    esac
    write_all "$MA.$MI.$PA" "$((app_b+1))"
    ;;
  set)
    write_all "${2:?set needs X.Y.Z}" "$((app_b+1))"
    ;;
  tag)
    require_aligned
    git tag -a "v$pkg_v" -m "BJJ Visualiser v$pkg_v (build $app_b)"
    echo "tagged v$pkg_v at $(git rev-parse --short HEAD)"
    ;;
  *)
    echo "usage: version.sh [current|verify|bump patch|minor|major|set X.Y.Z|tag]" >&2
    exit 1
    ;;
esac
