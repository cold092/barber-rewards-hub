const CACHE_NAME = "barbercrm-static-v10";
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
