//--------------------------------------------------------------------------
// You can find dozens of practical, detailed, and working examples of
// service worker usage on https://github.com/mozilla/serviceworker-cookbook
//--------------------------------------------------------------------------

console.log('Server Worked Called And Running!');

const CACHE_NAME = "offline";
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
    event.waitUntil(
        (async () => {
            const cache = await caches.open(CACHE_NAME);
            try {
                const response = await fetch(OFFLINE_URL);
                if (!response.ok) {
                    throw new Error(`Failed to fetch resource: ${OFFLINE_URL}, status: ${response.status}`);
                }
                await cache.put(OFFLINE_URL, response.clone());
            } catch (error) {
                console.error('Failed to cache the offline page:', error);
                // You might want to handle this error gracefully or retry the installation
            }
        })()
    );
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        (async () => {
            // Enable navigation preload if it's supported.
            // See https://developers.google.com/web/updates/2017/02/navigation-preload
            if ("navigationPreload" in self.registration) {
                await self.registration.navigationPreload.enable();
            }
        })()
    );

    // Tell the active service worker to take control of the page immediately.
    self.clients.claim();
});

self.addEventListener("fetch", (event) => {
    // Only call event.respondWith() if this is a navigation request
    // for an HTML page.
    if (event.request.mode === "navigate") {
        event.respondWith(
            (async () => {
                try {
                    // First, try to use the navigation preload response if it's
                    // supported.
                    const preloadResponse = await event.preloadResponse;
                    if (preloadResponse) {
                        return preloadResponse;
                    }

                    // Always try the network first.
                    return await fetch(event.request);

                } catch (error) {
                    // catch is only triggered if an exception is thrown, which is
                    // likely due to a network error.
                    // If fetch() returns a valid HTTP response with a response code in
                    // the 4xx or 5xx range, the catch() will NOT be called.
                    console.log("Fetch failed; returning offline page instead.", error);

                    const cache = await caches.open(CACHE_NAME);
                    return await cache.match(OFFLINE_URL);
                }
            })()
        );
    }
});