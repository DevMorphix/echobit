// Transparent forwarder for the published mobile app, which hardcodes
// https://recapi.badhusha.dev/api as its base URL. The new API Worker
// (apps/api) reproduces the old backend's routes and JSON shapes exactly,
// so this proxy only swaps the hostname: every request is passed through
// verbatim to UPSTREAM and the response is streamed back untouched.
//
// Only needed if the badhusha.dev zone lives in a DIFFERENT Cloudflare
// account than the echobit Worker. If it's in the same account, skip this
// and attach recapi.badhusha.dev directly to apps/api instead (see the
// commented routes in apps/api/wrangler.jsonc).

interface Env {
  UPSTREAM: string;
}

// /api/foo    → /api/v1/foo  (unversioned → v1 default)
// /api/v2/foo → unchanged     (explicit version passes through)
// /api/health → unchanged     (unversioned operational endpoint)
function versionedPath(pathname: string): string {
  return pathname.replace(/^\/api\/(?!v\d+\/|health$)/, '/api/v1/');
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = versionedPath(url.pathname);
    const target = new URL(path + url.search, env.UPSTREAM);
    // redirect: 'manual' keeps the proxy transparent — any Location header
    // from upstream reaches the client instead of being followed here.
    return fetch(new Request(target, request), { redirect: 'manual' });
  },
} satisfies ExportedHandler<Env>;
