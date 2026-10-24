#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"

if ! command -v pnpm >/dev/null 2>&1; then
    echo "error: pnpm is required to build the web frontend" >&2
    echo "Install pnpm (for example: corepack enable pnpm) and retry." >&2
    exit 1
fi

if [ ! -x web/node_modules/.bin/vite ] || [ ! -x web/node_modules/.bin/tsc ]; then
    echo "Installing web dependencies..."
    pnpm --prefix web install --frozen-lockfile
else
    echo "Web dependencies are already installed."
fi

pnpm --prefix web build
cargo deb -p console
cargo deb -p evelog

printf '\nBuilt packages:\n'
ls -1 target/debian/*.deb
