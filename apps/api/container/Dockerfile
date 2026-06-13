# ffmpeg transcode sidecar — converts arbitrary audio (webm/m4a/mp3/…) to the
# 16 kHz mono PCM WAV that the Sarvam chunker (audio/wav.ts) requires. Lets
# Indian-language users on non-WAV recorders reach saarika instead of silently
# falling back to Whisper (see audio/pipeline.ts).
# Debian (glibc) base, not Alpine: musl images crash under amd64 QEMU/Rosetta
# emulation when building from Apple Silicon (apk exits 133). Containers run
# linux/amd64, so the image is cross-built either way.
FROM oven/bun:1

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY server.ts .

EXPOSE 8080
CMD ["bun", "run", "server.ts"]
