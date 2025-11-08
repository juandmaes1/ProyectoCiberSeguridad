#!/bin/sh
set -e
trap "kill 0" EXIT

export PATH=$PATH:/usr/local/bin
export EXPO_DEVTOOLS_LISTEN_ADDRESS=${EXPO_DEVTOOLS_LISTEN_ADDRESS:-0.0.0.0}
export EXPO_USE_DEV_SERVER=${EXPO_USE_DEV_SERVER:-true}
export EXPO_NO_TELEMETRY=${EXPO_NO_TELEMETRY:-1}
export EXPO_NO_INTERACTIVE=${EXPO_NO_INTERACTIVE:-1}

EXPORT_DIR="${FIREBASE_EXPORT_DIR:-/app/firebase-export}"

echo "[firebase] Iniciando emuladores de Firebase..."
firebase emulators:start \
  --import="$EXPORT_DIR" \
  --only firestore,auth,storage \
  --export-on-exit \
  --project embarcadero-ba3cc &

# Esperar que los emuladores arranquen
sleep 10

echo "[expo] Iniciando Expo (modo tunel + web opcional)..."
npx expo start --tunnel --web --non-interactive

wait

