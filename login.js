const config =
  window.PICKDEE_CONFIG
  ||
  {};


const form =
  document.getElementById(
    "loginForm"
  );


const message =
  document.getElementById(
    "message"
  );


const submitButton =
  form
    ?.querySelector(
      'button[type="submit"]'
    );


/* =====================================================
   KIỂM TRA CONFIG
===================================================== */

if (
  !window.supabase
  ||
  !config.SUPABASE_URL
  ||
  !config.SUPABASE_PUBLISHABLE_KEY
) {

  if (
    message
  ) {

    message.textContent =
      "Không tải được hệ thống đăng nhập PickDee.";

  }


  if (
    submitButton
  ) {

    submitButton.disabled =
      true;

  }


  throw new Error(
    "PickDee Supabase config is missing."
  );

}


/* =====================================================
   SUPABASE
===================================================== */

const supabaseClient =
  supabase.createClient(
    config.SUPABASE_URL,
    config.SUPABASE_PUBLISHABLE_KEY
  );


/* =====================================================
   HELPERS
===================================================== */

function setMessage(
  text
) {

  if (
    message
  ) {

    message.textContent =
      text;

  }

}


function normalizeRole(
  value
) {

  return String(
    value
    ||
    ""
  )
    .trim()
    .toLocaleLowerCase(
      "vi-VN"
    );

}


function getNextPath() {

  const params =
    new URLSearchParams(
      window.location.search
    );


  return String(
    params.get("next")
    ||
    ""
  )
    .trim();

}


function isSafeShopNext(
  next
) {

  return (
    next === "/shop-admin"
    ||
    next.startsWith(
      "/shop-admin?"
    )
  );

}


function isSafeCoachNext(
  next
) {

  return (
    next === "/coach-opportunity"
    ||
    next.startsWith(
      "/coach-opportunity?"
    )
  );

}


/* =====================================================
   SHOP ROLE
===================================================== */

async function getShopAccess(
  userId
) {

  try {

    const {
      data,
      error
    } =
      await supabaseClient
        .from(
          "shop_user_roles"
        )
        .select(
          "role,is_active"
        )
        .eq(
          "user_id",
          userId
        )
        .eq(
          "is_active",
          true
        );


    if (
      error
    ) {

      console.warn(
        "SHOP ROLE ERROR:",
        error
      );


      return {
        hasShopAccess:
          false,

        roles:
          []
      };

    }


    const roles =
      (
        data
        ||
        []
      )
        .map(
          function (item) {

            return normalizeRole(
              item?.role
            );

          }
        );


    const hasShopAccess =
      [
        "owner",
        "shop_admin",
        "shop_staff"
      ]
        .some(
          function (role) {

            return roles.includes(
              role
            );

          }
        );


    return {
      hasShopAccess,
      roles
    };

  }
  catch (error) {

    console.warn(
      "SHOP ROLE CHECK ERROR:",
      error
    );


    return {
      hasShopAccess:
        false,

      roles:
        []
    };

  }

}


/* =====================================================
   PROFILE
===================================================== */

async function getProfile(
  userId
) {

  const {
    data,
    error
  } =
    await supabaseClient
      .from(
        "profiles"
      )
      .select(
        "email, full_name, role"
      )
      .eq(
        "id",
        userId
      )
      .maybeSingle();


  return {
    profile:
      data
      ||
      null,

    error
  };

}


/* =====================================================
   REDIRECT SAU ĐĂNG NHẬP

   Thứ tự:
   1. Nếu URL next yêu cầu Shop và có quyền Shop
   2. Nếu URL next yêu cầu Coach Opportunity và là Coach
   3. Có quyền Shop → Shop Admin
   4. Admin → Admin
   5. Coach → Coach
   6. Student → Student
===================================================== */

async function redirectAfterLogin(
  user
) {

  const userId =
    user?.id;


  if (
    !userId
  ) {

    throw new Error(
      "Không lấy được thông tin tài khoản."
    );

  }


  const next =
    getNextPath();


  const shopAccess =
    await getShopAccess(
      userId
    );


  /*
    Nếu người dùng có quyền Shop
    và link đang yêu cầu vào Shop Admin.
  */

  if (
    shopAccess.hasShopAccess
    &&
    isSafeShopNext(
      next
    )
  ) {

    window.location.replace(
      next
    );


    return;

  }


  /*
    Đọc role Academy/System.
  */

  const {
    profile,
    error:
      profileError
  } =
    await getProfile(
      userId
    );


  const profileRole =
    normalizeRole(
      profile?.role
    );


  /*
    Giữ nguyên luồng Coach Opportunity hiện tại.
  */

  if (
    profileRole === "coach"
    &&
    isSafeCoachNext(
      next
    )
  ) {

    window.location.replace(
      next
    );


    return;

  }


  /*
    Nếu có quyền Shop thì ưu tiên vào Shop Admin.
  */

  if (
    shopAccess.hasShopAccess
  ) {

    window.location.replace(
      "/shop-admin"
    );


    return;

  }


  /*
    Không có Shop role:
    tiếp tục phân quyền Academy/System.
  */

  if (
    profileError
    ||
    !profile
  ) {

    const accountType =
      String(
        user
          ?.user_metadata
          ?.account_type
        ||
        ""
      )
        .trim();


    if (
      accountType
      ===
      "coach_application"
    ) {

      throw new Error(
        "Hồ sơ Coach của bạn đang chờ Admin duyệt. Bạn chỉ có thể đăng nhập khu vực Coach sau khi hồ sơ được phê duyệt."
      );

    }


    throw new Error(
      "Không đọc được hồ sơ tài khoản."
    );

  }


  if (
    profileRole === "admin"
  ) {

    window.location.replace(
      "/admin"
    );


    return;

  }


  if (
    profileRole === "coach"
  ) {

    window.location.replace(
      "/coach"
    );


    return;

  }


  if (
    profileRole === "student"
    ||
    profileRole === "hocvien"
    ||
    profileRole === "học viên"
  ) {

    window.location.replace(
      "/student"
    );


    return;

  }


  throw new Error(
    "Tài khoản chưa được phân quyền."
  );

}


/* =====================================================
   LOGIN
===================================================== */

form.addEventListener(
  "submit",
  async function (event) {

    event.preventDefault();


    if (
      submitButton
    ) {

      submitButton.disabled =
        true;


      submitButton.textContent =
        "ĐANG ĐĂNG NHẬP...";

    }


    setMessage(
      "Đang đăng nhập..."
    );


    try {

      const email =
        document
          .getElementById(
            "email"
          )
          .value
          .trim();


      const password =
        document
          .getElementById(
            "password"
          )
          .value;


      if (
        !email
        ||
        !password
      ) {

        throw new Error(
          "Vui lòng nhập email và mật khẩu."
        );

      }


      const {
        data,
        error
      } =
        await supabaseClient
          .auth
          .signInWithPassword(
            {
              email,
              password
            }
          );


      if (
        error
      ) {

        console.error(
          "LOGIN ERROR:",
          error
        );


        throw new Error(
          "Email hoặc mật khẩu chưa đúng."
        );

      }


      const user =
        data?.user;


      if (
        !user
      ) {

        throw new Error(
          "Không lấy được thông tin tài khoản."
        );

      }


      setMessage(
        "Đăng nhập thành công. Đang mở đúng khu vực tài khoản..."
      );


      await redirectAfterLogin(
        user
      );

  }
  catch (error) {

    console.error(
      "PICKDEE LOGIN:",
      error
    );


    setMessage(
      error?.message
      ||
      "Không đăng nhập được."
    );


    if (
      submitButton
    ) {

      submitButton.disabled =
        false;


      submitButton.textContent =
        "ĐĂNG NHẬP";

    }

  }

);
