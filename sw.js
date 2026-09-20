/* =========================================================
   PICKDEE SERVICE WORKER - CLEAN NETWORK MODE
   2026-09-21

   Mục tiêu:
   - Xóa toàn bộ cache Service Worker cũ
   - Không chặn navigation
   - Không trả response redirect từ cache
   - Website luôn tải trực tiếp từ network
========================================================= */

const PICKDEE_SW_VERSION =
  "pickdee-clean-20260921-1";


self.addEventListener(
  "install",
  function (event) {

    self.skipWaiting();

  }
);


self.addEventListener(
  "activate",
  function (event) {

    event.waitUntil(
      (async function () {

        try {

          const cacheNames =
            await caches.keys();


          await Promise.all(
            cacheNames.map(
              function (cacheName) {

                return caches.delete(
                  cacheName
                );

              }
            )
          );


          await self.clients.claim();


          const clients =
            await self.clients.matchAll(
              {
                type: "window",
                includeUncontrolled: true
              }
            );


          clients.forEach(
            function (client) {

              client.postMessage(
                {
                  type:
                    "PICKDEE_SW_CLEAN",
                  version:
                    PICKDEE_SW_VERSION
                }
              );

            }
          );

        }
        catch (error) {

          console.error(
            "PickDee SW activate:",
            error
          );

        }

      })()
    );

  }
);


/*
  QUAN TRỌNG:

  CỐ Ý KHÔNG CÓ:
  self.addEventListener("fetch", ...)

  → Service Worker không còn chặn request.
  → /, /student, /coach, /admin...
    đều đi trực tiếp ra network.
  → Không còn lỗi redirected response
    do Service Worker.
*/
