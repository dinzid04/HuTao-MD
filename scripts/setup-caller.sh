#!/usr/bin/env bash
set -euo pipefail

# Auto-builder HuTao - MD MeowCaller Bridge (Pure Go, CGO_ENABLED=0, tanpa root)
# Bisa dijalankan di Linux VPS, Pterodactyl Panel (Node.js egg), maupun Termux Android.
# Penting: TMPDIR & GOTMPDIR diarahkan ke folder proyek ($ROOT_DIR/tmp/gotmp) agar tidak
# terkena limit tmpfs /tmp kecil di container Docker/Pterodactyl.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENGINE_DIR="$ROOT_DIR/call-engine"
BIN_DIR="$ROOT_DIR/bin"
OUT_BIN="$BIN_DIR/meowcaller-bridge"
TMP_GO_DIR="$ROOT_DIR/tmp/go-toolchain"
GOTMP_DIR="$ROOT_DIR/tmp/gotmp"
GOPATH_DIR="$ROOT_DIR/tmp/gopath"
GOCACHE_DIR="$ROOT_DIR/tmp/gocache"

mkdir -p "$BIN_DIR" "$ROOT_DIR/tmp" "$ROOT_DIR/data" "$GOTMP_DIR" "$GOPATH_DIR" "$GOCACHE_DIR"

# Bersihkan sisa folder temp kompilasi jika script keluar karena error
cleanup_gotmp() {
  rm -rf "$GOTMP_DIR"
}
trap cleanup_gotmp EXIT

export TMPDIR="$GOTMP_DIR"
export GOTMPDIR="$GOTMP_DIR"
export GOPATH="$GOPATH_DIR"
export GOCACHE="$GOCACHE_DIR"
export CGO_ENABLED=0

find_go_bin() {
  if command -v go >/dev/null 2>&1; then
    command -v go
    return 0
  fi
  if [ -x "$TMP_GO_DIR/go/bin/go" ]; then
    echo "$TMP_GO_DIR/go/bin/go"
    return 0
  fi
  return 1
}

check_go_version_ok() {
  local gobin="$1"
  local ver
  ver="$("$gobin" version 2>/dev/null | awk '{print $3}' | sed 's/^go//')"
  local major minor
  major="$(echo "$ver" | cut -d. -f1)"
  minor="$(echo "$ver" | cut -d. -f2)"
  if [ "${major:-0}" -gt 1 ] || { [ "${major:-0}" -eq 1 ] && [ "${minor:-0}" -ge 25 ]; }; then
    return 0
  fi
  return 1
}

GO_BIN=""
if existing="$(find_go_bin)" && check_go_version_ok "$existing"; then
  GO_BIN="$existing"
  echo "[CallSetup] Menggunakan Go: $("$GO_BIN" version)"
else
  echo "[CallSetup] Go >= 1.25 tidak ditemukan, mengunduh toolchain Go portable (tanpa root)..."
  ARCH="$(uname -m)"
  case "$ARCH" in
    x86_64|amd64) GO_ARCH="amd64" ;;
    aarch64|arm64) GO_ARCH="arm64" ;;
    *)
      echo "[CallSetup] Arsitektur tidak didukung otomatis: $ARCH" >&2
      exit 1
      ;;
  esac

  GO_VERSION="$(curl -fsSL "https://go.dev/VERSION?m=text" | head -n 1 | tr -d '\r\n')"
  if [ -z "$GO_VERSION" ]; then
    GO_VERSION="go1.25.0"
  fi
  TARBALL="${GO_VERSION}.linux-${GO_ARCH}.tar.gz"
  URL="https://go.dev/dl/${TARBALL}"
  echo "[CallSetup] Mengunduh $URL ..."

  rm -rf "$TMP_GO_DIR"
  mkdir -p "$TMP_GO_DIR"
  curl -fL "$URL" -o "$TMP_GO_DIR/$TARBALL"
  tar -xzf "$TMP_GO_DIR/$TARBALL" -C "$TMP_GO_DIR"
  rm -f "$TMP_GO_DIR/$TARBALL"
  GO_BIN="$TMP_GO_DIR/go/bin/go"
  echo "[CallSetup] Go portable siap: $("$GO_BIN" version)"
fi

export PATH="$(dirname "$GO_BIN"):$PATH"

echo "[CallSetup] Mengunduh dependensi purpshell/meowcaller & mengkompilasi bridge..."
echo "[CallSetup] GOTMPDIR=$GOTMPDIR"
cd "$ENGINE_DIR"
"$GO_BIN" get github.com/purpshell/meowcaller@latest
"$GO_BIN" mod tidy
"$GO_BIN" build -p 2 -trimpath -ldflags="-s -w" -o "$OUT_BIN" .
chmod +x "$OUT_BIN"

# Bersihkan cache build besar (~800MB) setelah binary statis berhasil dibuat
echo "[CallSetup] Membersihkan cache build sementara..."
chmod -R u+w "$GOPATH_DIR" 2>/dev/null || true
rm -rf "$GOTMP_DIR" "$GOCACHE_DIR" "$GOPATH_DIR" "$TMP_GO_DIR"

echo "[CallSetup] Selesai! Binary siap di: $OUT_BIN"
