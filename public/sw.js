const CACHE_NAME = "barbercrm-static-v11";
const STATIC_ASSETS = ["/", "/index.html"];

const isApiRequest = (requestUrl) => {
  return (
    requestUrl.pathname.startsWith("/rest/") ||
    requestUrl.pathname.startsWith("/auth/") ||
    requestUrl.pathname.startsWith("/storage/") ||
    requestUrl.host.includes("supabase.co")
  );
};

const isMetadataRequest = (requestUrl) => {
  return requestUrl.pathname === "/manifest.json" || requestUrl.pathname === "/favicon.ico" || requestUrl.pathname === "/icon.svg";
};

const isAppShellAsset = (request, requestUrl) => {
  return (
    request.destination === "script" ||
    request.destination === "style" ||
    requestUrl.pathname.startsWith("/assets/") ||
    requestUrl.pathname.includes("/node_modules/.vite/")
  );
};

const shouldCacheResponse = (response) => response && response.ok && response.type !== "opaque";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

// Push notification handler
self.addEventListener("push", (event) => {
  if (!event.data) return;
  try {
    const payload = event.data.json();
    const { title, body, icon, tag, data } = payload;
    event.waitUntil(
      self.registration.showNotification(title || "Follow-up", {
        body: body || "",
        icon: icon || "/icon.svg",
        badge: "/icon.svg",
        tag: tag || "follow-up-push",
        data: data || {},
        vibrate: [200, 100, 200],
        actions: [{ action: "open", title: tag === "redemption-push" ? "Ver resgates" : "Ver leads" }],
      })
    );
  } catch (e) {
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification("Follow-up", { body: text, icon: "/icon.svg" })
    );
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/leads";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin)) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      return self.clients.openWindow(url);
    })
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const url = new URL(event.request.url);

  if (isApiRequest(url) || isMetadataRequest(url)) {
    event.respondWith(fetch(event.request));
    return;
  }

  const isNavigation = event.request.mode === "navigate" || event.request.headers.get("accept")?.includes("text/html");
  if (isNavigation) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (shouldCacheResponse(response)) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match("/index.html")))
    );
    return;
  }

  if (isAppShellAsset(event.request, url)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (shouldCacheResponse(response)) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((response) => {
          if (shouldCacheResponse(response)) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);

      return cached || fetchPromise;
    })
  );
});
