/* =========================================================
   PICKDEE ACADEMY
   COACH AUTH GATE

   Telegram KHÔNG bắt buộc.
   File này chỉ kiểm tra Coach đã đăng nhập hay chưa.
========================================================= */

(async function () {

  if (
    window.PICKDEE_COACH_AUTH_GATE_LOADED
  ) {
    return;
  }


  window.PICKDEE_COACH_AUTH_GATE_LOADED =
    true;


  const cfg =
    window.PICKDEE_CONFIG
    ||
    {};


  let sb =
    window.PICKDEE_SUPABASE
    ||
    window.supabaseClient
    ||
    window.sb
    ||
    null;


  /*
    Một số trang Coach cũ có thể chưa
    chia sẻ Supabase client.
  */

  if (
    !sb
    &&
    window.supabase
    &&
    cfg.SUPABASE_URL
    &&
    cfg.SUPABASE_PUBLISHABLE_KEY
  ) {

    sb =
      window.supabase.createClient(
        cfg.SUPABASE_URL,
        cfg.SUPABASE_PUBLISHABLE_KEY
      );

  }


  /*
    Không có Supabase client
    thì không cho vào khu vực Coach.
  */

  if (!sb) {

    console.error(
      "PICKDEE COACH AUTH: Supabase client chưa sẵn sàng."
    );


    window.location.replace(
      "/login"
    );


    return;

  }


  try {

    const {
      data: {
        session
      },
      error
    } =
      await sb.auth.getSession();


    /*
      Chưa đăng nhập
      → quay về trang login.
    */

    if (
      error
      ||
      !session
    ) {

      window.location.replace(
        "/login"
      );


      return;

    }


    /*
      ĐÃ ĐĂNG NHẬP.

      Telegram không còn là điều kiện
      để sử dụng PickDee Academy.
    */

    console.log(
      "✓ PickDee Coach auth PASS. Telegram optional."
    );

  }
  catch (error) {

    console.error(
      "PICKDEE COACH AUTH:",
      error
    );


    window.location.replace(
      "/login"
    );

  }

})();
