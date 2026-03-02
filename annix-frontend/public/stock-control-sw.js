const CACHE_VERSION = "v1";
const STATIC_CACHE_NAME = `stock-control-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE_NAME = `stock-control-dynamic-${CACHE_VERSION}`;
const API_CACHE_NAME = `stock-control-api-${CACHE_VERSION}`;

let companyId = null;

const STATIC_ASSETS = [
  "/stock-control/portal/dashboard",
  "/stock-control/portal/inventory",
  "/stock-control/portal/job-cards",
  "/stock-control/portal/deliveries",
  "/stock-control/portal/requisitions",
  "/stock-control-manifest.json",
];

const API_ROUTES = [
  "/stock-control/inventory",
  "/stock-control/job-cards",
  "/stock-control/deliveries",
  "/stock-control/requisitions",
  "/stock-control/dashboard",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE_NAME).then((cache) => {
        return cache.addAll(STATIC_ASSETS).catch((error) => {
          console.warn("Failed to cache some static assets:", error);
        });
      }),
      self.skipWaiting(),
    ])
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              return (
                name.startsWith("stock-control-") &&
                name !== STATIC_CACHE_NAME &&
                name !== DYNAMIC_CACHE_NAME &&
                name !== API_CACHE_NAME
              );
            })
            .map((name) => caches.delete(name))
        );
      }),
      self.clients.claim(),
    ])
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET") {
    if (
      request.method === "POST" ||
      request.method === "PATCH" ||
      request.method === "DELETE" ||
      request.method === "PUT"
    ) {
      event.respondWith(handleMutationRequest(request));
    }
    return;
  }

  if (
    url.pathname.startsWith("/api/stock-control") ||
    (url.pathname.startsWith("/stock-control/") &&
      url.hostname !== self.location.hostname)
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

  if (url.pathname.startsWith("/stock-control")) {
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

    return new Response(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Offline - Stock Control</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              padding: 2rem;
              text-align: center;
              background: #f9fafb;
              color: #1f2937;
              min-height: 100vh;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
            }
            .icon { font-size: 4rem; margin-bottom: 1rem; }
            h1 { color: #0d9488; margin-bottom: 0.5rem; }
            p { color: #6b7280; margin-bottom: 1.5rem; }
            button {
              background: #0d9488;
              color: white;
              border: none;
              padding: 0.75rem 1.5rem;
              border-radius: 0.5rem;
              cursor: pointer;
              font-size: 1rem;
              font-weight: 500;
            }
            button:hover { background: #0f766e; }
          </style>
        </head>
        <body>
          <div class="icon">📦</div>
          <h1>You're Offline</h1>
          <p>Stock Control requires an internet connection for this page.</p>
          <button onclick="window.location.reload()">Try Again</button>
        </body>
      </html>`,
      {
        headers: { "Content-Type": "text/html" },
      }
    );
  }
}

async function handleApiRequest(request) {
  const url = new URL(request.url);
  const isStockControlApi = API_ROUTES.some((route) =>
    url.pathname.includes(route)
  );

  try {
    const response = await fetch(request);

    if (response.ok && isStockControlApi) {
      const cache = await caches.open(API_CACHE_NAME);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    if (isStockControlApi) {
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

    return new Response(
      JSON.stringify({ error: "You are offline", offline: true }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }
    );
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
      }
    );
  }
}

async function queueOfflineAction(action) {
  const db = await openDatabase();
  const tx = db.transaction("pendingActions", "readwrite");
  const store = tx.objectStore("pendingActions");

  return new Promise((resolve, reject) => {
    const request = store.add(action);
    request.onsuccess = () => {
      if ("sync" in self.registration) {
        self.registration.sync.register("sync-pending-actions");
      }
      resolve(request.result);
    };
    request.onerror = () => reject(request.error);
  });
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("stock-control-offline", 1);

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

      if (!db.objectStoreNames.contains("stockItems")) {
        const store = db.createObjectStore("stockItems", { keyPath: "id" });
        store.createIndex("category", "category", { unique: false });
        store.createIndex("sku", "sku", { unique: false });
      }

      if (!db.objectStoreNames.contains("jobCards")) {
        const store = db.createObjectStore("jobCards", { keyPath: "id" });
        store.createIndex("status", "status", { unique: false });
        store.createIndex("jobNumber", "jobNumber", { unique: false });
      }

      if (!db.objectStoreNames.contains("deliveryNotes")) {
        const store = db.createObjectStore("deliveryNotes", { keyPath: "id" });
        store.createIndex("deliveryNumber", "deliveryNumber", { unique: false });
      }

      if (!db.objectStoreNames.contains("photos")) {
        const store = db.createObjectStore("photos", {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex("entityType", "entityType", { unique: false });
        store.createIndex("entityId", "entityId", { unique: false });
        store.createIndex("synced", "synced", { unique: false });
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
  if (event.tag === "sync-photos") {
    event.waitUntil(syncPendingPhotos());
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
        deleteStore.delete(action.id);

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

async function syncPendingPhotos() {
  const db = await openDatabase();
  const tx = db.transaction("photos", "readonly");
  const store = tx.objectStore("photos");
  const index = store.index("synced");
  const photos = await getAllFromIndex(index, IDBKeyRange.only(false));

  for (const photo of photos) {
    try {
      const formData = new FormData();
      formData.append("photo", photo.blob, photo.filename);

      const response = await fetch(photo.uploadUrl, {
        method: "POST",
        headers: {
          Authorization: photo.authHeader,
        },
        body: formData,
      });

      if (response.ok) {
        const updateTx = db.transaction("photos", "readwrite");
        const updateStore = updateTx.objectStore("photos");
        photo.synced = true;
        updateStore.put(photo);

        await notifyClients({
          type: "PHOTO_SYNC_SUCCESS",
          photoId: photo.id,
        });
      }
    } catch (error) {
      console.error("Failed to sync photo:", error);
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

function getAllFromIndex(index, range) {
  return new Promise((resolve, reject) => {
    const request = index.getAll(range);
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
        })
      );
      break;

    case "CLEAR_CACHE":
      event.waitUntil(
        caches.keys().then((names) => {
          return Promise.all(
            names
              .filter((name) => name.startsWith("stock-control-"))
              .map((name) => caches.delete(name))
          );
        })
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
        })
      );
      break;

    case "GET_VERSION":
      event.source.postMessage({
        type: "VERSION",
        version: CACHE_VERSION,
      });
      break;

    case "SET_COMPANY_ID":
      companyId = data.companyId;
      break;
  }
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const iconUrl = companyId
    ? `/api/stock-control/${companyId}/icon/192`
    : "/images/stock-control-icon-192.png";

  event.waitUntil(
    self.registration.showNotification(data.title || "Stock Control", {
      body: data.body,
      icon: iconUrl,
      badge: "/images/stock-control-icon-192.png",
      tag: data.tag || "stock-control-notification",
      data: data.data,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || "/stock-control/portal/dashboard";

  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      const existingClient = clients.find((client) =>
        client.url.includes("/stock-control")
      );

      if (existingClient) {
        existingClient.focus();
        existingClient.navigate(urlToOpen);
      } else {
        self.clients.openWindow(urlToOpen);
      }
    })
  );
});
