#!/usr/bin/env bash
# Bring up a virtual display + headless PulseAudio (null sink), then run the
# control server. Audio setup is best-effort: the control server MUST come up so
# Cloudflare sees port 8080 open and the DO can reach /join — a PulseAudio hiccup
# is reported via /status, it never aborts boot. (No `set -e` for that reason.)
export HOME=/root
export XDG_RUNTIME_DIR=/tmp/pulse-runtime
mkdir -p "$XDG_RUNTIME_DIR"

# Virtual display for headful Chromium (Meet's WebRTC needs a real GPU-less X).
Xvfb :99 -screen 0 1280x720x24 -nolisten tcp &
export DISPLAY=:99

# PulseAudio runs as root here; disable shm (often unavailable in containers).
pulseaudio -D --exit-idle-time=-1 --disallow-exit --disable-shm=true 2>&1 || echo '[start] pulseaudio failed to start'
sleep 1
pactl load-module module-null-sink sink_name=meetsink sink_properties=device.description=meetsink 2>&1 || echo '[start] null-sink load failed'
pactl set-default-sink meetsink 2>&1 || true
export PULSE_SINK=meetsink

exec node server.js
