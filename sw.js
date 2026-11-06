/* 轻秤离线外壳：核心页面仍然是完整的单文件 index.html。 */
const CACHE_NAME = 'qingcheng-weight-shell-v2-20261107';
const APP_SHELL = [
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png'
];

const offlinePage = `<!doctype html>
<html lang="zh-CN">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>轻秤 · 暂时无法打开</title></head>
<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#f3f7fa;color:#233b4a;font-family:-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif;">
  <main style="padding:28px;text-align:center;">
    <h1 style="font-size:20px;font-weight:600;margin:0 0 10px;">轻秤暂时无法打开</h1>
    <p style="margin:0;color:#5a7080;font-size:14px;line-height:1.7;">请确认当前页面已成功打开过一次，或直接打开本地的 index.html。</p>
  </main>
</body>
</html>`;

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(APP_SHELL.map(async (url) => {
      try {
        const response = await fetch(new Request(url, { cache: 'reload' }));
        if (response && response.ok) await cache.put(url, response.clone());
      } catch (error) {
        // 单个附属资源失败不阻塞整个壳安装，页面本身仍可离线打开。
      }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const networkResponse = await fetch(request);
        if (networkResponse && networkResponse.ok) {
          await cache.put('./index.html', networkResponse.clone());
        }
        return networkResponse;
      } catch (error) {
        return (await cache.match('./index.html'))
          || (await cache.match(request))
          || new Response(offlinePage, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;
    try {
      const networkResponse = await fetch(request);
      if (networkResponse && networkResponse.ok) {
        await cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    } catch (error) {
      return new Response('', { status: 504, statusText: 'Offline' });
    }
  })());
});
