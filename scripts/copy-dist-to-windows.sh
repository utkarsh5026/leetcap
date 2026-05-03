#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Copy dist/ next to your Windows user profile so Chrome on Windows can
"Load unpacked" from a path under C:\Users\... (WSL2: /mnt/c/...).

Usage:
  scripts/copy-dist-to-windows.sh [--build] [--optional]

  --build      Run vite build before copying (does not run bun run build)
  --optional   If no Windows profile is found, exit 0 (for CI / Linux only)

Environment:
  WINDOWS_DIST_PARENT   WSL path to copy into (default: Windows %USERPROFILE%)

Examples:
  scripts/copy-dist-to-windows.sh
  scripts/copy-dist-to-windows.sh --build
  WINDOWS_DIST_PARENT=/mnt/c/Users/alex/Downloads scripts/copy-dist-to-windows.sh
EOF
}

BUILD=0
OPTIONAL=0
while [ "${1:-}" != "" ]; do
  case "$1" in
    -h | --help)
      usage
      exit 0
      ;;
    --build)
      BUILD=1
      ;;
    --optional)
      OPTIONAL=1
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
  shift
done

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [ "$BUILD" -eq 1 ]; then
  bunx vite build
fi

if [ ! -d dist ]; then
  echo "No dist/ folder. Run bun run build or pass --build." >&2
  exit 1
fi

windows_parent() {
  if [ -n "${WINDOWS_DIST_PARENT:-}" ]; then
    printf '%s\n' "$WINDOWS_DIST_PARENT"
    return
  fi
  local winprofile wslprofile
  if command -v powershell.exe >/dev/null 2>&1; then
    winprofile="$(powershell.exe -NoProfile -Command "Write-Output \$env:USERPROFILE" 2>/dev/null | tr -d '\r' || true)"
    if [ -n "$winprofile" ] && command -v wslpath >/dev/null 2>&1; then
      wslprofile="$(wslpath -u "$winprofile" 2>/dev/null || true)"
      if [ -n "$wslprofile" ] && [ -d "$wslprofile" ]; then
        printf '%s\n' "$wslprofile"
        return
      fi
    fi
  fi
  if [ -n "${USER:-}" ] && [ -d "/mnt/c/Users/$USER" ]; then
    printf '%s\n' "/mnt/c/Users/$USER"
    return
  fi
  printf ''
}

PARENT="$(windows_parent)"
if [ -z "$PARENT" ] || [ ! -d "$PARENT" ]; then
  if [ "$OPTIONAL" -eq 1 ]; then
    echo "Skipping Windows dist copy (no Windows user profile / WSL mount detected)." >&2
    exit 0
  fi
  echo "Could not resolve a Windows-side folder (tried USERPROFILE via PowerShell, then /mnt/c/Users/\$USER)." >&2
  echo "Set WINDOWS_DIST_PARENT to a path under /mnt/c/... and retry." >&2
  exit 1
fi

DEST="$PARENT/leetcap-dist"
rm -rf "$DEST"
cp -a dist "$DEST"

echo "Copied to: $DEST"
if command -v wslpath >/dev/null 2>&1; then
  echo "Windows path: $(wslpath -w "$DEST")"
fi
