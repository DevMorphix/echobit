#!/usr/bin/env bash
# Bring up a shared virtual display + a single headless PulseAudio daemon, then
# run the multi-session control server (it creates one null sink per meeting on
# demand). Audio setup is best-effort so the control server always comes up and
# the DO can reach it — a PulseAudio hiccup surfaces via /status, it never
# aborts boot. (No `set -e` for that reason.)
export HOME=/root
export XDG_RUNTIME_DIR=/tmp/pulse-runtime
mkdir -p "$XDG_RUNTIME_DIR"

# One Xvfb hosts every headful Chromium window (Meet's WebRTC needs a real
# GPU-less X). Sessions share the display; only audio is isolated per session.
Xvfb :99 -screen 0 1280x720x24 -nolisten tcp &
export DISPLAY=:99

# PulseAudio runs as root here; disable shm (often unavailable in containers).
pulseaudio -D --exit-idle-time=-1 --disallow-exit --disable-shm=true 2>&1 || echo '[start] pulseaudio failed to start'
sleep 1
# Honor each session's PULSE_SINK exactly: without this, PulseAudio "remembers"
# a device per application and could route a second Chromium onto the first
# session's sink, cross-mixing two meetings' audio.
pactl unload-module module-stream-restore 2>&1 || echo '[start] stream-restore unload skipped'

exec node server.js
