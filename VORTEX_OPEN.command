#!/bin/zsh
set -euo pipefail
ROOT="/Users/nicholasgeorge/workspace/company/03_HEPHAESTUS/03_PROJECTS/VORTEX"
cd "$ROOT"
echo "VORTEX launcher"
echo "Open the verified VORTEX frontend URL in Safari only after confirming the live dev port."
open -a "Visual Studio Code" "$ROOT"
