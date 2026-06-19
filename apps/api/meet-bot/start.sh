#!/usr/bin/env bash
# Bring up a headless PulseAudio with a null sink, then run the control server.
# Chromium plays the Meet audio into "meetsink"; ffmpeg records meetsink.monitor.
set -e

export XDG_RUNTIME_DIR=/tmp/pulse-runtime
mkdir -p "$XDG_RUNTIME_DIR"

pulseaudio -D --exit-idle-time=-1 --disallow-exit
# Give the daemon a moment to come up before configuring sinks.
sleep 1
pactl load-module module-null-sink sink_name=meetsink sink_properties=device.description=meetsink
pactl set-default-sink meetsink

export PULSE_SINK=meetsink
exec xvfb-run -a --server-args="-screen 0 1280x720x24" node server.js
