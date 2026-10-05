/* 饮食打卡 · 离线缓存 Service Worker
   注意：GitHub Pages 对所有文件都带 Cache-Control: max-age=600（10 分钟强缓存），
   所以这里所有网络请求都要显式绕过 HTTP 缓存，否则更新会延迟十分钟才生效。 */
const CACHE_NAME = 'diet-tracker-v20';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      // cache:'reload' → 预缓存时也绕过 HTTP 缓存，避免把旧的 index.html/图标存进来
      .then((cache) => cache.addAll(CORE_ASSETS.map((u) => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  // 页面导航：网络优先（no-store 绕过 10 分钟强缓存），失败回退缓存（保证更新及时，也能离线打开）
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', copy));
          }
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // 静态资源：缓存优先，未命中再请求（同样绕过 HTTP 缓存）并写入缓存
  event.respondWith(
    caches.match(request).then((hit) => {
      if (hit) return hit;
      return fetch(request, { cache: 'no-store' })
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});
