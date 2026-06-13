// POST any audio body → 16 kHz mono PCM WAV body. Transcodes via disk (not
// pipes) so ffmpeg writes a proper seekable WAV header with correct RIFF sizes
// — parseWavHeader/wavChunks on the Worker side depend on those being right.
//
// Input is streamed to disk (compressed audio is small); the output WAV is
// streamed back from disk via Bun.file, so neither side fully buffers a
// multi-hour file in the lite instance's 256 MiB.

const PORT = 8080;

const transcode = async (req: Request): Promise<Response> => {
  if (req.method !== 'POST' || !req.body) {
    return new Response('POST an audio body', { status: 405 });
  }

  const id = crypto.randomUUID();
  const inPath = `/tmp/${id}.in`;
  const outPath = `/tmp/${id}.wav`;

  try {
    // Stream the request body to disk
    const sink = Bun.file(inPath).writer();
    for await (const chunk of req.body as ReadableStream<Uint8Array>) sink.write(chunk);
    await sink.end();

    const proc = Bun.spawn(
      ['ffmpeg', '-y', '-i', inPath, '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', outPath],
      { stderr: 'pipe' },
    );
    const code = await proc.exited;
    await Bun.file(inPath).delete().catch(() => {});

    if (code !== 0) {
      const err = await new Response(proc.stderr).text();
      return new Response(`ffmpeg exit ${code}: ${err.slice(-500)}`, { status: 422 });
    }

    // Stream the WAV back from disk (BunFile reads lazily)
    return new Response(Bun.file(outPath), { headers: { 'content-type': 'audio/wav' } });
  } catch (err) {
    await Bun.file(inPath).delete().catch(() => {});
    await Bun.file(outPath).delete().catch(() => {});
    return new Response(`transcode error: ${(err as Error).message}`, { status: 500 });
  }
};

Bun.serve({ port: PORT, idleTimeout: 0, fetch: transcode });
console.log(`ffmpeg transcode server listening on :${PORT}`);
