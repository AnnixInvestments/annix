export const STARTUP_SPLASH_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>Starting up…</title>
<style>
  * { box-sizing: border-box; }
  html, body { height: 100%; margin: 0; }
  body {
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #e8e8f5;
    background: radial-gradient(circle at 50% 35%, #2a2a6e 0%, #1a1a40 45%, #101028 100%);
  }
  .card { text-align: center; padding: 2rem; max-width: 30rem; }
  .wordmark {
    font-size: 2rem;
    font-weight: 800;
    letter-spacing: 0.35em;
    margin: 0 0 0.25rem;
    padding-left: 0.35em;
    background: linear-gradient(90deg, #ffffff, #b9b9ec);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
  .tagline { font-size: 0.7rem; letter-spacing: 0.3em; color: #8a8ac8; margin: 0 0 2.25rem; }
  .ring {
    width: 44px; height: 44px; margin: 0 auto 1.5rem;
    border: 3px solid rgba(255,255,255,0.15);
    border-top-color: #ff8a00;
    border-radius: 50%;
    animation: spin 0.9s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .title { font-size: 1.1rem; font-weight: 600; margin: 0 0 0.5rem; }
  .subtitle { font-size: 0.9rem; color: #a6a6d6; margin: 0; line-height: 1.5; }
  @media (prefers-reduced-motion: reduce) { .ring { animation-duration: 3s; } }
</style>
</head>
<body>
  <div class="card">
    <div class="ring" aria-hidden="true"></div>
    <p class="wordmark">ANNIX</p>
    <p class="tagline">INVESTMENTS</p>
    <p class="title">Starting up</p>
    <p class="subtitle">We're getting things ready — this usually takes a few seconds. This page will refresh on its own.</p>
  </div>
  <script>setTimeout(function () { location.reload(); }, 3000);</script>
</body>
</html>`;
