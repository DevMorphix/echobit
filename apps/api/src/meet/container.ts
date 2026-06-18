// Headless-Chrome meeting bot, hosted in a Cloudflare Container (meet-bot/).
// The container joins a Google Meet, captures the call audio via a PulseAudio
// virtual sink + ffmpeg, and exposes a small control API the MeetingBot
// orchestrator polls:
//   POST /join   { meetingUrl, botName, maxDurationSecs }  → ack
//   GET  /status                                           → { state, durationSecs, error }
//   GET  /audio                                            → WAV stream
//   POST /stop                                             → ends the session
//
// sleepAfter is generous because a meeting runs for its whole duration; the
// orchestrator's ~1-min status polls keep the instance warm, and it scales to
// zero shortly after the call ends.

import { Container } from '@cloudflare/containers';

export class MeetBotContainer extends Container {
  defaultPort = 8080;
  sleepAfter = '15m';
}
