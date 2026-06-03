const CACHE_VERSION = "v1";
const STATIC_CACHE_NAME = `orbit-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE_NAME = `orbit-dynamic-${CACHE_VERSION}`;

const STATIC_ASSETS = ["/annix/orbit", "/api/annix-orbit/manifest.json"];

if (self.location.hostname === "localhost" || self.location.hostname === "127.0.0.1") {
  self.addEventListener("install", () => self.skipWaiting());
  self.addEventListener("activate", (event) => {
    event.waitUntil(
      (async () => {
        await self.clients.claim();
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
        await self.registration.unregister();
        const windows = await self.clients.matchAll({ type: "window" });
        await Promise.all(windows.map((client) => client.navigate(client.url).catch(() => {})));
      })(),
    );
  });
} else {
  self.addEventListener("install", (event) => {
    event.waitUntil(
      Promise.all([
        caches.open(STATIC_CACHE_NAME).then((cache) =>
          cache.addAll(STATIC_ASSETS).catch((error) => {
            console.warn("Orbit SW: failed to cache some static assets:", error);
          }),
        ),
        self.skipWaiting(),
      ]),
    );
  });

  self.addEventListener("activate", (event) => {
    event.waitUntil(
      Promise.all([
        caches.keys().then((cacheNames) =>
          Promise.all(
            cacheNames
              .filter(
                (name) =>
                  name.startsWith("orbit-") &&
                  name !== STATIC_CACHE_NAME &&
                  name !== DYNAMIC_CACHE_NAME,
              )
              .map((name) => caches.delete(name)),
          ),
        ),
        self.clients.claim(),
      ]),
    );
  });

  self.addEventListener("fetch", (event) => {
    const { request } = event;
    const url = new URL(request.url);

    if (request.method !== "GET" || url.hostname !== self.location.hostname) {
      return;
    }

    if (
      url.pathname.startsWith("/_next/static/") ||
      url.pathname.match(/\.(js|css|woff2?|png|jpg|jpeg|gif|svg|ico)$/)
    ) {
      event.respondWith(handleStaticAsset(request));
      return;
    }

    if (url.pathname.startsWith("/annix/orbit")) {
      event.respondWith(handleNavigationRequest(request));
      return;
    }
  });

  self.addEventListener("message", (event) => {
    if (event.data && event.data.type === "SKIP_WAITING") {
      self.skipWaiting();
    }
  });

  self.addEventListener("push", (event) => {
    if (!event.data) return;

    const data = event.data.json();
    event.waitUntil(
      self.registration.showNotification(data.title || "Annix Orbit", {
        body: data.body,
        icon: "/branding/annix-orbit-icon.png",
        badge: "/branding/annix-orbit-icon.png",
        tag: data.tag || "annix-orbit-notification",
        data: data.data,
      }),
    );
  });

  self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const target = event.notification.data?.url || "/annix/orbit";

    event.waitUntil(
      self.clients.matchAll({ type: "window" }).then((clients) => {
        const existing = clients.find((client) => client.url.includes("/annix/orbit"));
        if (existing) {
          existing.focus();
          existing.navigate(target);
        } else {
          self.clients.openWindow(target);
        }
      }),
    );
  });
}

async function handleStaticAsset(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    console.error("Orbit SW: static asset fetch failed:", error);
    throw error;
  }
}

async function handleNavigationRequest(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    return new Response(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Offline - Annix Orbit</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              padding: 2rem;
              text-align: center;
              background: #f6f7fb;
              color: #1f2937;
              min-height: 100vh;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
            }
            .icon { font-size: 4rem; margin-bottom: 1rem; }
            h1 { color: #323288; margin-bottom: 0.5rem; }
            p { color: #6b7280; margin-bottom: 1.5rem; }
            button {
              background: #323288;
              color: white;
              border: none;
              padding: 0.75rem 1.5rem;
              border-radius: 0.5rem;
              cursor: pointer;
              font-size: 1rem;
              font-weight: 500;
            }
          </style>
        </head>
        <body>
          <div class="icon">🛰️</div>
          <h1>You're Offline</h1>
          <p>Annix Orbit needs an internet connection for this page.</p>
          <button onclick="window.location.reload()">Try Again</button>
        </body>
      </html>`,
      { headers: { "Content-Type": "text/html" } },
    );
  }
}
