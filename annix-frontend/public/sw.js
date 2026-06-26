// This worker is registered for Annix Pulse at scope /annix-pulse (see
// ServiceWorkerRegistration). Its routes and cache names were inherited from
// the app's former FieldFlow identity and pointed at /fieldflow, so under the
// /annix-pulse scope the navigation/offline logic never matched — it is now
// aligned to the real /annix-pulse paths.
const CACHE_NAME = "annix-pulse-v1";
const STATIC_CACHE_NAME = "annix-pulse-static-v1";
const DYNAMIC_CACHE_NAME = "annix-pulse-dynamic-v1";
const API_CACHE_NAME = "annix-pulse-api-v1";

const STATIC_ASSETS = [
  "/annix-pulse",
  "/annix-pulse/prospects",
  "/annix-pulse/meetings",
  "/annix-pulse/schedule",
  "/annix-pulse/settings",
  "/manifest.json",
];

const API_ROUTES = ["/annix-pulse/prospects", "/annix-pulse/meetings", "/annix-pulse/visits"];

const OFFLINE_FALLBACK_PAGE = "/annix-pulse/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE_NAME).then((cache) => {
        return cache.addAll(STATIC_ASSETS).catch((error) => {
          console.warn("Failed to cache some static assets:", error);
        });
      }),
      self.skipWaiting(),
    ]),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              // Purge this app's own old caches only — both the legacy
              // fieldflow-* names and any superseded annix-pulse-* version.
              // Never touch other apps' caches (orbit-*, stock-control-*).
              return (
                (name.startsWith("annix-pulse-") || name.startsWith("fieldflow-")) &&
                name !== STATIC_CACHE_NAME &&
                name !== DYNAMIC_CACHE_NAME &&
                name !== API_CACHE_NAME
              );
            })
            .map((name) => caches.delete(name)),
        );
      }),
      self.clients.claim(),
    ]),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET") {
    if (request.method === "POST" || request.method === "PATCH" || request.method === "DELETE") {
      event.respondWith(handleMutationRequest(request));
    }
    return;
  }

  if (
    url.pathname.startsWith("/api/") ||
    (url.pathname.startsWith("/annix-pulse/") && url.hostname !== self.location.hostname)
  ) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.match(/\.(js|css|woff2?|png|jpg|jpeg|gif|svg|ico)$/)
  ) {
    event.respondWith(handleStaticAsset(request));
    return;
  }

  if (url.pathname.startsWith("/annix-pulse")) {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  event.respondWith(fetch(request));
});

async function handleStaticAsset(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.error("Static asset fetch failed:", error);
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

    const offlinePage = await caches.match(OFFLINE_FALLBACK_PAGE);
    if (offlinePage) {
      return offlinePage;
    }

    return new Response(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Offline - Annix Pulse</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: system-ui; padding: 2rem; text-align: center; background: #0f172a; color: white; }
            h1 { color: #3b82f6; }
            button { background: #3b82f6; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 0.5rem; cursor: pointer; margin-top: 1rem; }
          </style>
        </head>
        <body>
          <h1>You're Offline</h1>
          <p>Please check your internet connection and try again.</p>
          <button onclick="window.location.reload()">Retry</button>
        </body>
      </html>`,
      {
        headers: { "Content-Type": "text/html" },
      },
    );
  }
}

async function handleApiRequest(request) {
  const url = new URL(request.url);
  const isFieldFlowApi = API_ROUTES.some((route) => url.pathname.includes(route));

  try {
    const response = await fetch(request);

    if (response.ok && isFieldFlowApi) {
      const cache = await caches.open(API_CACHE_NAME);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    if (isFieldFlowApi) {
      const cached = await caches.match(request);
      if (cached) {
        const headers = new Headers(cached.headers);
        headers.set("X-From-Cache", "true");
        return new Response(cached.body, {
          status: cached.status,
          statusText: cached.statusText,
          headers,
        });
      }
    }

    return new Response(JSON.stringify({ error: "You are offline", offline: true }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function handleMutationRequest(request) {
  try {
    return await fetch(request);
  } catch (error) {
    const clonedRequest = request.clone();
    const body = await clonedRequest.text();

    await queueOfflineAction({
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      body,
      timestamp: Date.now(),
    });

    return new Response(
      JSON.stringify({
        queued: true,
        message: "Action queued for sync when online",
      }),
      {
        status: 202,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

async function queueOfflineAction(action) {
  const db = await openDatabase();
  const tx = db.transaction("pendingActions", "readwrite");
  const store = tx.objectStore("pendingActions");
  await store.add(action);
  await tx.done;

  if ("sync" in self.registration) {
    await self.registration.sync.register("sync-pending-actions");
  }
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    // Kept as "fieldflow-offline" deliberately: this DB holds queued offline
    // mutations not yet synced. Renaming it would orphan a user's pending
    // actions. The name is internal and never shown to users.
    const request = indexedDB.open("fieldflow-offline", 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains("pendingActions")) {
        const store = db.createObjectStore("pendingActions", {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex("timestamp", "timestamp", { unique: false });
      }

      if (!db.objectStoreNames.contains("prospects")) {
        const store = db.createObjectStore("prospects", { keyPath: "id" });
        store.createIndex("status", "status", { unique: false });
        store.createIndex("updatedAt", "updatedAt", { unique: false });
      }

      if (!db.objectStoreNames.contains("meetings")) {
        const store = db.createObjectStore("meetings", { keyPath: "id" });
        store.createIndex("scheduledStart", "scheduledStart", { unique: false });
        store.createIndex("status", "status", { unique: false });
      }

      if (!db.objectStoreNames.contains("visits")) {
        const store = db.createObjectStore("visits", { keyPath: "id" });
        store.createIndex("prospectId", "prospectId", { unique: false });
      }

      if (!db.objectStoreNames.contains("syncMeta")) {
        db.createObjectStore("syncMeta", { keyPath: "key" });
      }
    };
  });
}

self.addEventListener("sync", (event) => {
  if (event.tag === "sync-pending-actions") {
    event.waitUntil(syncPendingActions());
  }
});

async function syncPendingActions() {
  const db = await openDatabase();
  const tx = db.transaction("pendingActions", "readonly");
  const store = tx.objectStore("pendingActions");
  const actions = await getAllFromStore(store);

  for (const action of actions) {
    try {
      const response = await fetch(action.url, {
        method: action.method,
        headers: action.headers,
        body: action.body,
      });

      if (response.ok) {
        const deleteTx = db.transaction("pendingActions", "readwrite");
        const deleteStore = deleteTx.objectStore("pendingActions");
        await deleteStore.delete(action.id);

        await notifyClients({
          type: "SYNC_SUCCESS",
          action: action,
        });
      }
    } catch (error) {
      console.error("Failed to sync action:", error);
    }
  }
}

function getAllFromStore(store) {
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function notifyClients(message) {
  const clients = await self.clients.matchAll({ type: "window" });
  clients.forEach((client) => {
    client.postMessage(message);
  });
}

self.addEventListener("message", (event) => {
  const { type, data } = event.data;

  switch (type) {
    case "SKIP_WAITING":
      self.skipWaiting();
      break;

    case "CACHE_URLS":
      event.waitUntil(
        caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
          return cache.addAll(data.urls);
        }),
      );
      break;

    case "CLEAR_CACHE":
      event.waitUntil(
        caches.keys().then((names) => {
          return Promise.all(names.map((name) => caches.delete(name)));
        }),
      );
      break;

    case "GET_PENDING_COUNT":
      event.waitUntil(
        openDatabase().then((db) => {
          const tx = db.transaction("pendingActions", "readonly");
          const store = tx.objectStore("pendingActions");
          return new Promise((resolve) => {
            const countRequest = store.count();
            countRequest.onsuccess = () => {
              event.source.postMessage({
                type: "PENDING_COUNT",
                count: countRequest.result,
              });
              resolve();
            };
          });
        }),
      );
      break;
  }
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  const data = event.data.json();

  event.waitUntil(
    self.registration.showNotification(data.title || "Annix Pulse", {
      body: data.body,
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-72x72.png",
      tag: data.tag || "annix-pulse-notification",
      data: data.data,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || "/annix-pulse";

  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      const existingClient = clients.find((client) => client.url.includes("/annix-pulse"));

      if (existingClient) {
        existingClient.focus();
        existingClient.navigate(urlToOpen);
      } else {
        self.clients.openWindow(urlToOpen);
      }
    }),
  );
});
