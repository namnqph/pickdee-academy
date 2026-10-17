(function () {

  "use strict";


  /* =====================================================
     PICKDEE SHOP - SHARED PUBLIC NAVIGATION
  ====================================================== */

  const header =
    document.getElementById(
      "shopPublicHeader"
    );

  if (!header) {
    return;
  }


  /* =====================================================
     STYLE
  ====================================================== */

  if (
    !document.getElementById(
      "pickdeeShopPublicNavStyle"
    )
  ) {

    const style =
      document.createElement(
        "style"
      );

    style.id =
      "pickdeeShopPublicNavStyle";

    style.textContent = `

      #shopPublicHeader {
        position: sticky;
        top: 0;
        z-index: 90;

        width: 100%;

        border-bottom:
          1px solid rgba(255,255,255,.08);

        background:
          rgba(7,21,35,.96);

        backdrop-filter:
          blur(14px);

        -webkit-backdrop-filter:
          blur(14px);
      }


      #shopPublicHeader
      .pd-shop-nav-inner {

        width:
          min(
            1180px,
            calc(100% - 24px)
          );

        min-height: 64px;

        margin: auto;

        display: flex;
        align-items: center;
        justify-content: space-between;

        gap: 10px;
      }


      #shopPublicHeader
      .pd-shop-brand {

        flex: 0 0 auto;

        color: #ffffff;

        text-decoration: none;

        font-size: 21px;
        font-weight: 950;

        letter-spacing: -.04em;

        white-space: nowrap;
      }


      #shopPublicHeader
      .pd-shop-brand span {
        color: #d8ff45;
      }


      #shopPublicHeader
      .pd-shop-actions {

        display: flex;
        align-items: center;

        gap: 6px;

        min-width: 0;
      }


      #shopPublicHeader
      .pd-shop-action {

        min-height: 38px;

        padding:
          0 10px;

        display: inline-flex;
        align-items: center;
        justify-content: center;

        border-radius: 11px;

        border:
          1px solid rgba(255,255,255,.13);

        background:
          rgba(255,255,255,.035);

        color: #ffffff;

        text-decoration: none;

        font-size: 10px;
        font-weight: 950;

        white-space: nowrap;

        touch-action: manipulation;
      }


      #shopPublicHeader
      .pd-shop-action.active {

        border-color:
          rgba(216,255,69,.42);

        background:
          rgba(216,255,69,.07);
      }


      #shopPublicHeader
      .pd-shop-cart {

        color: #d8ff45;

        border-color:
          rgba(216,255,69,.30);
      }


      #shopPublicHeader
      .pd-shop-cart-count {

        min-width: 20px;
        height: 20px;

        margin-left: 5px;

        padding:
          0 5px;

        display: inline-flex;
        align-items: center;
        justify-content: center;

        border-radius: 999px;

        background: #d8ff45;

        color: #071523;

        font-size: 10px;
        font-weight: 950;
      }


      #shopPublicHeader
      .pd-shop-menu {

        position: relative;

        flex: 0 0 auto;
      }


      #shopPublicHeader
      .pd-shop-menu-toggle {

        width: 38px;
        height: 38px;

        padding: 0;

        display: inline-flex;
        align-items: center;
        justify-content: center;

        border-radius: 11px;

        border:
          1px solid rgba(255,255,255,.14);

        background:
          rgba(255,255,255,.04);

        color: #ffffff;

        font-size: 17px;
        font-weight: 950;

        cursor: pointer;

        list-style: none;

        user-select: none;
        -webkit-user-select: none;

        touch-action: manipulation;
      }


      #shopPublicHeader
      .pd-shop-menu-toggle::-webkit-details-marker {
        display: none;
      }


      #shopPublicHeader
      .pd-shop-menu-panel {

        position: absolute;

        top:
          calc(100% + 9px);

        right: 0;

        width: 225px;

        padding: 8px;

        border-radius: 14px;

        border:
          1px solid rgba(255,255,255,.12);

        background: #0d1d2f;

        box-shadow:
          0 18px 45px
          rgba(0,0,0,.38);
      }


      #shopPublicHeader
      .pd-shop-menu-item {

        min-height: 45px;

        padding:
          0 12px;

        display: flex;
        align-items: center;
        justify-content: space-between;

        gap: 10px;

        border-radius: 10px;

        color: #ffffff;

        text-decoration: none;

        font-size: 11px;
        font-weight: 900;
      }


      #shopPublicHeader
      .pd-shop-menu-item:hover {

        background:
          rgba(255,255,255,.06);
      }


      #shopPublicHeader
      .pd-shop-menu-item.current {

        background:
          rgba(216,255,69,.08);

        color: #d8ff45;
      }


      #shopPublicHeader
      .pd-shop-menu-item.disabled {

        color:
          rgba(255,255,255,.42);

        cursor: default;
      }


      #shopPublicHeader
      .pd-shop-status {

        color: #d8ff45;

        font-size: 8px;
        font-weight: 950;

        white-space: nowrap;
      }


      #shopPublicHeader
      .pd-shop-cart-mobile {

        display: none;
      }


      @media(max-width:700px) {

        #shopPublicHeader
        .pd-shop-nav-inner {

          width:
            calc(100% - 18px);

          min-height: 60px;

          gap: 6px;
        }


        #shopPublicHeader
        .pd-shop-brand {

          font-size: 19px;
        }


        #shopPublicHeader
        .pd-shop-actions {

          gap: 5px;
        }


        #shopPublicHeader
        .pd-shop-action {

          min-height: 36px;

          padding:
            0 8px;

          border-radius: 10px;

          font-size: 9px;
        }


        #shopPublicHeader
        .pd-shop-cart-desktop {

          display: none;
        }


        #shopPublicHeader
        .pd-shop-cart-mobile {

          display: inline;

          font-size: 14px;
        }


        #shopPublicHeader
        .pd-shop-menu-toggle {

          width: 36px;
          height: 36px;

          font-size: 16px;
        }


        #shopPublicHeader
        .pd-shop-menu-panel {

          width: 215px;
        }


        /*
          Chống Safari iPhone tự zoom
          khi focus ô nhập liệu.
        */

        input,
        select,
        textarea {

          font-size:
            16px !important;
        }

      }


      @media(max-width:380px) {

        #shopPublicHeader
        .pd-shop-brand {

          font-size: 18px;
        }


        #shopPublicHeader
        .pd-shop-action {

          padding:
            0 7px;

          font-size: 8px;
        }

      }

    `;


    document.head.appendChild(
      style
    );

  }


  /* =====================================================
     CURRENT PAGE
  ====================================================== */

 const path =
  window.location.pathname
    .toLowerCase()
    .replace(
      /\/+$/,
      ""
    );


  const lookupActive =
    path.endsWith(
      "/shop-order-lookup"
    )
    ||
    path.endsWith(
      "/shop-track"
    );


  const cartActive =
    path.endsWith(
      "/shop-cart"
    )
    ||
    path.endsWith(
      "/shop-checkout"
    );


  /* =====================================================
     HEADER HTML
  ====================================================== */

  header.innerHTML = `

    <div class="pd-shop-nav-inner">


      <a
        class="pd-shop-brand"
        href="./shop"
        aria-label="PickDee Shop"
      >
        PickDee<span>Shop</span>
      </a>


      <div class="pd-shop-actions">


        <a
          href="./shop-order-lookup"
          class="
            pd-shop-action
            ${lookupActive ? "active" : ""}
          "
          ${lookupActive ? 'aria-current="page"' : ""}
        >
          📦 TRA CỨU ĐƠN
        </a>


        <a
          href="./shop-cart"
          class="
            pd-shop-action
            pd-shop-cart
            ${cartActive ? "active" : ""}
          "
          ${cartActive ? 'aria-current="page"' : ""}
        >

          <span class="pd-shop-cart-desktop">
            🛒 GIỎ HÀNG
          </span>

          <span class="pd-shop-cart-mobile">
            🛒
          </span>

          <span
            id="cartCount"
            class="pd-shop-cart-count"
          >
            0
          </span>

        </a>


        <details
          class="pd-shop-menu"
          id="pickdeeShopEcosystemMenu"
        >

          <summary
            class="pd-shop-menu-toggle"
            aria-label="Mở hệ sinh thái PickDee"
          >
            ☰
          </summary>


          <div class="pd-shop-menu-panel">


            <a
              href="./"
              class="pd-shop-menu-item"
            >
              <span>
                🎓 PICKDEE ACADEMY
              </span>

              <span>
                ›
              </span>
            </a>


            <div
              class="
                pd-shop-menu-item
                current
              "
            >
              <span>
                🛍️ PICKDEE SHOP
              </span>

              <span class="pd-shop-status">
                ĐANG Ở ĐÂY
              </span>
            </div>


            <div
              class="
                pd-shop-menu-item
                disabled
              "
            >
              <span>
                🏓 PICKDEE OPEN PLAY
              </span>

              <span class="pd-shop-status">
                SẮP CÓ
              </span>
            </div>


          </div>

        </details>


      </div>

    </div>

  `;


  /* =====================================================
     CART COUNT
  ====================================================== */

  function updateCartCount() {

    const count =
      document.getElementById(
        "cartCount"
      );


    if (!count) {
      return;
    }


    try {

      const cart =
        JSON.parse(
          localStorage.getItem(
            "pickdee_shop_cart"
          )
          ||
          "[]"
        );


      const ids =
        new Set(
          (
            Array.isArray(cart)
              ?
                cart
              :
                []
          )
            .filter(
              function (item) {

                return (
                  item
                  &&
                  item.variant_id != null
                );

              }
            )
            .map(
              function (item) {

                return String(
                  item.variant_id
                );

              }
            )
        );


      count.textContent =
        String(
          ids.size
        );

    }
    catch (_) {

      count.textContent =
        "0";

    }

  }


  updateCartCount();


  window.addEventListener(
    "storage",
    updateCartCount
  );


  window.addEventListener(
    "pageshow",
    updateCartCount
  );


  /*
    Một số trang Shop thay đổi localStorage
    ngay trong cùng tab.
  */

  document.addEventListener(
    "click",
    function () {

      window.setTimeout(
        updateCartCount,
        80
      );

    }
  );


  window.PickDeeShopNav = {
    refreshCartCount:
      updateCartCount
  };


  /* =====================================================
     CLOSE MENU WHEN CLICK OUTSIDE
  ====================================================== */

  const menu =
    document.getElementById(
      "pickdeeShopEcosystemMenu"
    );


  document.addEventListener(
    "click",
    function (event) {

      if (
        menu
        &&
        menu.open
        &&
        !menu.contains(
          event.target
        )
      ) {

        menu.open =
          false;

      }

    }
  );


  document.addEventListener(
    "keydown",
    function (event) {

      if (
        event.key === "Escape"
        &&
        menu
      ) {

        menu.open =
          false;

      }

    }
  );
  /* =====================================================
     PICKDEE SUPPORT - SHARED SHOP LOADER
  ====================================================== */

  function loadPickDeeSupport() {

    if (
      document.getElementById(
        "pickdeeSupportRoot"
      )
    ) {
      return;
    }


    if (
      document.querySelector(
        'script[data-pickdee-support-loader="1"]'
      )
    ) {
      return;
    }


    const cfg =
      window.PICKDEE_CONFIG || {};


    if (
      !window.supabase
      ||
      !cfg.SUPABASE_URL
      ||
      !cfg.SUPABASE_PUBLISHABLE_KEY
    ) {

      window.setTimeout(
        loadPickDeeSupport,
        300
      );


      return;

    }


    const script =
      document.createElement(
        "script"
      );


    script.src =
      "/support-widget.js?v=20261017-bot8";


    script.async =
      true;


    script.dataset.pickdeeSupportLoader =
      "1";


    document.body.appendChild(
      script
    );

  }


  loadPickDeeSupport();
})();
