# Google Meet recording bot. Playwright's image ships Chromium + all browser
# deps; we add PulseAudio (virtual sink) + ffmpeg (capture) on top. The image
# tag MUST match the playwright version in package.json so the preinstalled
# browsers under /ms-playwright are reused. Containers run linux/amd64.
FROM mcr.microsoft.com/playwright:v1.49.1-jammy

RUN apt-get update \
  && apt-get install -y --no-install-recommends pulseaudio pulseaudio-utils ffmpeg \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY server.js start.sh ./
RUN chmod +x start.sh

EXPOSE 8080
CMD ["./start.sh"]
