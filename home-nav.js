(async function () {

  const cfg =
    window.PICKDEE_CONFIG || {};

  if (
    !window.supabase
    ||
    !cfg.SUPABASE_URL
    ||
    !cfg.SUPABASE_PUBLISHABLE_KEY
  ) {
    return;
  }

  const homeSb =
    window.supabase.createClient(
      cfg.SUPABASE_URL,
      cfg.SUPABASE_PUBLISHABLE_KEY
    );

  function findBrand() {

    const selectors = [
      ".brand",
      ".topbar .brand",
      "header .brand",
      ".logo",
      "header .logo"
    ];

    for (
      const selector
      of selectors
    ) {

      const element =
        document.querySelector(
          selector
        );

      if (element) {
        return element;
      }

    }

    const elements =
      Array.from(
        document.querySelectorAll(
          "header a, header div, header span"
        )
      );

    return (
      elements.find(
        element => {

          const text =
            String(
              element.textContent || ""
            )
              .replace(/\s+/g, " ")
              .trim();

          return (
            text ===
            "PickDee Academy"
            ||
            text.includes(
              "PickDee Academy"
            )
          );

        }
      )
      ||
      null
    );

  }

  async function getHomeUrl() {

    try {

      const {
        data: {
          session
        },
        error:
          sessionError
      } =
        await homeSb.auth.getSession();

      if (
        sessionError
        ||
        !session?.user
      ) {
        return "./index.html";
      }

      const {
        data: profile,
        error:
          profileError
      } =
        await homeSb
          .from("profiles")
          .select("role")
          .eq(
            "id",
            session.user.id
          )
          .maybeSingle();

      if (profileError) {

        console.error(
          "HOME NAV ROLE:",
          profileError
        );

        return "./index.html";
      }

      const role =
        String(
          profile?.role || ""
        )
          .trim()
          .toLowerCase();

      if (role === "admin") {
        return "./admin";
      }

      if (role === "coach") {
        return "./coach";
      }

      if (
        role === "student"
        ||
        role === "hocvien"
        ||
        role === "học viên"
      ) {
        return "./student";
      }

      return "./index.html";

    }
    catch (error) {

      console.error(
        "HOME NAV:",
        error
      );

      return "./index.html";
    }

  }

  async function installHomeNavigation() {

    const brand =
      findBrand();

    if (!brand) {
      return;
    }

    if (
      brand.dataset
        .pickdeeHomeNav ===
      "1"
    ) {
      return;
    }

    brand.dataset
      .pickdeeHomeNav =
      "1";

    brand.style.cursor =
      "pointer";

    brand.style.userSelect =
      "none";

    brand.title =
      "Về trang chủ";

    brand.setAttribute(
      "role",
      "link"
    );

    brand.setAttribute(
      "tabindex",
      "0"
    );

    async function goHome() {

      const url =
        await getHomeUrl();

      window.location.href =
        url;

    }

    brand.addEventListener(
      "click",
      goHome
    );

    brand.addEventListener(
      "keydown",
      function (event) {

        if (
          event.key ===
          "Enter"
          ||
          event.key ===
          " "
        ) {

          event.preventDefault();

          goHome();
        }

      }
    );

  }

  await installHomeNavigation();

})();
