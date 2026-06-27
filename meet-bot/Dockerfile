# Google Meet recording bot. Playwright's image ships Chromium + all browser
# deps; we add PulseAudio (virtual sinks) + ffmpeg (capture) on top. The image
# tag MUST match the playwright version in package.json so the preinstalled
# browsers under /ms-playwright are reused. The image is multi-arch — build it
# on the target VM (e.g. Oracle Ampere A1 is arm64) so the arch matches.
FROM mcr.microsoft.com/playwright:v1.55.1-jammy

RUN apt-get update \
  && apt-get install -y --no-install-recommends pulseaudio pulseaudio-utils ffmpeg \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY server.js start.sh ./
RUN chmod +x start.sh

# Max concurrent meetings this instance will accept (override per VM size).
ENV MAX_SESSIONS=6

EXPOSE 8080
CMD ["./start.sh"]
