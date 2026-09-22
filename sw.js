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
"pickdee-push-20260922-1";


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
/* =========================================================
   PICKDEE WEB PUSH
   - Nhận Push Notification
   - Bấm notification sẽ mở đúng trang PickDee
   - KHÔNG thêm fetch handler
========================================================= */

function pickdeeSafeUrl(
  value
) {

  try {

    const url =
      new URL(
        value || "/",
        self.location.origin
      );


    if (
      url.origin
      !==
      self.location.origin
    ) {

      return (
        self.location.origin
        +
        "/"
      );

    }


    return url.href;

  }
  catch (error) {

    return (
      self.location.origin
      +
      "/"
    );

  }

}


self.addEventListener(
  "push",
  function (event) {

    let payload = {};


    try {

      payload =
        event.data
          ?
          event.data.json()
          :
          {};

    }
    catch (error) {

      payload = {
        body:
          event.data
            ?
            event.data.text()
            :
            ""
      };

    }


    const title =
      payload.title
      ||
      "PickDee Academy";


    const targetUrl =
      pickdeeSafeUrl(
        payload.url
        ||
        "/"
      );


    const options = {

      body:
        payload.body
        ||
        "Bạn có thông báo mới từ PickDee.",

      icon:
        "/icon-192.png",

      badge:
        "/icon-192.png",

      tag:
        payload.tag
        ||
        "pickdee-notification",

      renotify:
        true,

      data: {
        url:
          targetUrl
      }

    };


    event.waitUntil(
      self.registration
        .showNotification(
          title,
          options
        )
    );

  }
);


self.addEventListener(
  "notificationclick",
  function (event) {

    event.notification.close();


    const targetUrl =
      pickdeeSafeUrl(
        event.notification
          ?.data
          ?.url
        ||
        "/"
      );


    event.waitUntil(
      (
        async function () {

          const windowClients =
            await self.clients
              .matchAll(
                {
                  type: "window",
                  includeUncontrolled: true
                }
              );


          for (
            const client
            of windowClients
          ) {

            try {

              const currentUrl =
                new URL(
                  client.url
                );


              if (
                currentUrl.origin
                ===
                self.location.origin
              ) {

                if (
                  "navigate"
                  in
                  client
                ) {

                  await client.navigate(
                    targetUrl
                  );

                }


                return client.focus();

              }

            }
            catch (error) {

              console.warn(
                "PickDee notification client:",
                error
              );

            }

          }


          return self.clients
            .openWindow(
              targetUrl
            );

        }
      )()
    );

  }
);
