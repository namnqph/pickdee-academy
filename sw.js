/* =========================================================
   PICKDEE SERVICE WORKER - CLEAN NETWORK MODE
   2026-10-07

   Mục tiêu:
   - Xóa toàn bộ cache Service Worker cũ
   - Không chặn navigation
   - Không cache HTML / navigation
   - Website luôn tải trực tiếp từ network
   - Giữ Web Push Notification
   - Chặn URL notification bị ghép sai
========================================================= */

const PICKDEE_SW_VERSION =
  "pickdee-push-20261114-badge1";


/* =========================================================
   INSTALL
========================================================= */

self.addEventListener(
  "install",
  function (event) {

    event.waitUntil(
      self.skipWaiting()
    );

  }
);


/* =========================================================
   ACTIVATE
   - Xóa cache cũ
   - Nhận quyền điều khiển client mới ngay
========================================================= */

self.addEventListener(
  "activate",
  function (event) {

    event.waitUntil(
      (
        async function () {

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


            const windowClients =
              await self.clients.matchAll(
                {
                  type: "window",
                  includeUncontrolled: true
                }
              );


            windowClients.forEach(
              function (client) {

                try {

                  client.postMessage(
                    {
                      type:
                        "PICKDEE_SW_CLEAN",

                      version:
                        PICKDEE_SW_VERSION
                    }
                  );

                }
                catch (_) {

                  /*
                    Không để lỗi postMessage
                    ảnh hưởng activate.
                  */

                }

              }
            );

          }
          catch (error) {

            console.error(
              "PickDee SW activate:",
              error
            );

          }

        }
      )()
    );

  }
);


/* =========================================================
   QUAN TRỌNG

   CỐ Ý KHÔNG CÓ:

   self.addEventListener(
     "fetch",
     ...
   );

   Service Worker này:

   - KHÔNG intercept navigation
   - KHÔNG cache HTML
   - KHÔNG cache redirect
   - KHÔNG rewrite URL
   - KHÔNG thay đổi request

   Các trang như:

   /
   /home
   /academy
   /academy.html
   /student
   /coach
   /admin
   /shop
   /shop-admin

   đều đi trực tiếp ra network.
========================================================= */


/* =========================================================
   PICKDEE WEB PUSH
========================================================= */


/*
  Chuẩn hóa URL dùng cho notification.

  Chấp nhận:

  /
  /academy
  /academy.html
  /coach
  https://pickdee.vn/academy

  Không chấp nhận URL domain khác.

  Đồng thời xử lý trường hợp lỗi kiểu:

  /academyhttps://pickdee.vn/academy

  để tránh tạo ra URL:

  https://pickdee.vn/academyhttps://pickdee.vn/academy
*/

function pickdeeSafeUrl(
  value
) {

  try {

    let raw =
      String(
        value || "/"
      )
        .trim();


    if (
      !raw
    ) {

      raw = "/";

    }



    /*
      ======================================================
      SỬA URL BỊ GHÉP SAI
      ======================================================

      Ví dụ:

      /academyhttps://pickdee.vn/academy

      Nếu có https:// hoặc http:// nằm giữa chuỗi,
      lấy phần absolute URL phía sau ra kiểm tra lại.
    */

    const httpsIndex =
      raw.indexOf(
        "https://"
      );


    const httpIndex =
      raw.indexOf(
        "http://"
      );


    let embeddedIndex =
      -1;


    if (
      httpsIndex > 0
    ) {

      embeddedIndex =
        httpsIndex;

    }
    else if (
      httpIndex > 0
    ) {

      embeddedIndex =
        httpIndex;

    }


    if (
      embeddedIndex > 0
    ) {

      raw =
        raw.slice(
          embeddedIndex
        );

    }



    const url =
      new URL(
        raw,
        self.location.origin
      );



    /*
      Chỉ cho phép URL cùng origin PickDee.
    */

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



    /*
      Không cho javascript:, data:, blob:...
    */

    if (
      url.protocol !== "https:"
      &&
      url.protocol !== "http:"
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

    console.warn(
      "PickDee safe URL:",
      error
    );


    return (
      self.location.origin
      +
      "/"
    );

  }

}


/* =========================================================
   PUSH
========================================================= */

self.addEventListener(
  "push",
  function (event) {

    let payload =
      {};


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



    // Lời mời nhận học viên (tự giao Coach): rung dài, giữ trên màn hình tới khi Coach bấm.
    // Web Push không cho chọn file chuông riêng → dùng chuông mặc định của máy (không silent).
    const isDispatchOffer =
      /\/coach-opportunity\b/.test(targetUrl)
      &&
      /[?&]offer=/.test(targetUrl);



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
        (
          isDispatchOffer
            ?
              "pickdee-offer-" + (targetUrl.match(/[?&]offer=([^&#]+)/) || [])[1]
            :
              ""
        )
        ||
        payload.tag
        ||
        "pickdee-notification",


      renotify:
        true,


      vibrate:
        isDispatchOffer
          ?
            [600, 250, 600, 250, 600, 250, 1200]
          :
            undefined,


      requireInteraction:
        isDispatchOffer,


      silent:
        false,


      data: {

        url:
          targetUrl,

        swVersion:
          PICKDEE_SW_VERSION

      }

    };



    event.waitUntil(
      Promise.all([
        self.registration
          .showNotification(
            title,
            options
          ),
        pickdeeBumpBadge(payload)
      ])
    );

  }
);


/* =========================================================
   BADGE TRÊN ICON APP
   Số trên icon phải = số chưa đọc trên chuông trong app.
   - App đang mở (thấy trên màn hình): báo trang tự đếm lại số thật.
   - App đóng: cộng 1 vào số đã lưu (trang đã ghi số thật lần mở cuối).
   - Payload có "badge" (số) thì dùng luôn số đó.
   Trang ghi số thật vào cache "pd-badge" mỗi lần đếm (pdSyncAppBadge).
========================================================= */

async function pickdeeBumpBadge(payload) {
  try {
    if (!self.navigator || !("setAppBadge" in self.navigator)) return;

    const windowClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const visible = windowClients.filter(function (c) { return c.visibilityState === "visible"; });
    if (visible.length) {
      visible.forEach(function (c) { try { c.postMessage({ type: "PICKDEE_BADGE_RESYNC" }); } catch (_) {} });
      return;
    }

    const cache = await caches.open("pd-badge");
    let n;
    if (payload && Number.isFinite(Number(payload.badge)) && payload.badge !== "" && payload.badge !== null) {
      n = Math.max(0, Number(payload.badge));
    } else {
      const res = await cache.match("/__pd_badge");
      const cur = res ? Number(await res.text()) || 0 : 0;
      n = cur + 1;
    }
    await cache.put("/__pd_badge", new Response(String(n)));
    if (n > 0) await self.navigator.setAppBadge(n); else await self.navigator.clearAppBadge();
  } catch (_) { /* badge là phụ, lỗi thì bỏ qua để không chặn hiện thông báo */ }
}


/* =========================================================
   NOTIFICATION CLICK
========================================================= */

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

          try {

            const windowClients =
              await self.clients.matchAll(
                {
                  type: "window",
                  includeUncontrolled: true
                }
              );



            /*
              Mỗi app PickDee (Shop/Academy/Admin/Inbox...) có
              start_url riêng (/shop, /admin, /inbox...) dù dùng
              chung scope "/". Nếu dùng lại BẤT KỲ tab PickDee nào
              đang mở (vd tab Shop) rồi navigate() sang app khác,
              trang mới bị ghép vào lịch sử của tab đó -> bấm Back
              lại văng về app cũ thay vì thoát app mới.

              Chỉ dùng lại tab hiện có khi nó CÙNG app (cùng
              segment đầu của đường dẫn) với thông báo; khác app
              thì mở cửa sổ/app mới, lịch sử tách biệt.
            */

            const targetTopPath =
              new URL(
                targetUrl,
                self.location.origin
              )
                .pathname
                .split("/")[1]
              || "";

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
                  !==
                  self.location.origin
                ) {

                  continue;

                }



                const currentTopPath =
                  currentUrl
                    .pathname
                    .split("/")[1]
                  || "";



                if (
                  currentTopPath
                  !==
                  targetTopPath
                ) {

                  continue;

                }



                if (
                  "navigate"
                  in
                  client
                ) {

                  await client.navigate(
                    targetUrl
                  );

                }



                if (
                  "focus"
                  in
                  client
                ) {

                  return client.focus();

                }



                return;

              }
              catch (error) {

                console.warn(
                  "PickDee notification client:",
                  error
                );

              }

            }



            /*
              Không có tab PickDee đang mở:
              mở cửa sổ mới.
            */

            if (
              self.clients.openWindow
            ) {

              return self.clients.openWindow(
                targetUrl
              );

            }

          }
          catch (error) {

            console.error(
              "PickDee notification click:",
              error
            );

          }

        }
      )()
    );

  }
);
