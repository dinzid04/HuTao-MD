#!/data/data/com.termux/files/usr/bin/env bash
# HuTao - MD Termux Stable Runner
# Menjaga bot tetap hidup stabil di Android Termux (wake-lock + auto-restart + batas RAM aman)

set -u

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR" || exit 1

echo "=========================================="
echo "  HuTao - MD — Termux Stable Launcher"
echo "=========================================="

# Cek dependensi sistem dasar Termux
MISSING_PKGS=""
command -v node >/dev/null 2>&1 || MISSING_PKGS="$MISSING_PKGS nodejs"
command -v git >/dev/null 2>&1 || MISSING_PKGS="$MISSING_PKGS git"
command -v ffmpeg >/dev/null 2>&1 || MISSING_PKGS="$MISSING_PKGS ffmpeg"

if [ -n "$MISSING_PKGS" ]; then
    echo "[Termux] Menginstal paket wajib:$MISSING_PKGS ..."
    if command -v pkg >/dev/null 2>&1; then
        pkg update -y && pkg install -y $MISSING_PKGS
    else
        echo "[Termux] Paket belum terpasang:$MISSING_PKGS — silakan install manual."
    fi
fi

# Cek node_modules
if [ ! -d "node_modules/@whiskeysockets/baileys" ]; then
    echo "[Termux] Menginstal dependensi npm (mode aman Android ARM64)..."
    npm install --allow-git=all --no-audit --no-fund
fi

# Aktifkan wake-lock agar Android tidak membunuh proses Termux saat layar mati
if command -v termux-wake-lock >/dev/null 2>&1; then
    termux-wake-lock
    echo "[Termux] termux-wake-lock aktif (bot tetap jalan saat layar mati)."
fi

cleanup() {
    echo ""
    echo "[Termux] Menghentikan bot..."
    if command -v termux-wake-unlock >/dev/null 2>&1; then
        termux-wake-unlock
    fi
    exit 0
}
trap cleanup INT TERM

# Batasi heap Node.js agar tidak terkena OOM killer di HP RAM 4-8GB
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=512}"

CRASH_COUNT=0
while true; do
    START_TS=$(date +%s)
    echo "[Termux] Menjalankan HuTao - MD... ($(date '+%H:%M:%S'))"
    node index.js --pairing-code "$@"
    EXIT_CODE=$?
    END_TS=$(date +%s)
    RUN_SEC=$((END_TS - START_TS))

    # Jika bot jalan lebih dari 60 detik, reset hitungan crash
    if [ "$RUN_SEC" -ge 60 ]; then
        CRASH_COUNT=0
    else
        CRASH_COUNT=$((CRASH_COUNT + 1))
    fi

    # Backoff bertahap (3s, 5s, 10s, max 30s) agar tidak memakan CPU/baterai jika crash beruntun
    if [ "$CRASH_COUNT" -le 1 ]; then
        WAIT_SEC=3
    elif [ "$CRASH_COUNT" -le 3 ]; then
        WAIT_SEC=8
    else
        WAIT_SEC=20
    fi

    echo "[Termux] Bot keluar (kode $EXIT_CODE, uptime ${RUN_SEC}s). Restart dalam ${WAIT_SEC}s..."
    sleep "$WAIT_SEC"
done
