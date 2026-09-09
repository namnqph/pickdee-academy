const config = window.PICKDEE_CONFIG;

const supabaseClient = supabase.createClient(
  config.SUPABASE_URL,
  config.SUPABASE_PUBLISHABLE_KEY
);

const form = document.getElementById("loginForm");
const message = document.getElementById("message");


form.addEventListener("submit", async (event) => {

  event.preventDefault();

  message.textContent = "Đang đăng nhập...";


  const email =
    document
      .getElementById("email")
      .value
      .trim();


  const password =
    document
      .getElementById("password")
      .value;


  /* ================================
     1. ĐĂNG NHẬP SUPABASE
  ================================= */

  const {
    data,
    error
  } =
    await supabaseClient
      .auth
      .signInWithPassword({
        email,
        password
      });


  if (error) {

    console.error(error);

    message.textContent =
      "Email hoặc mật khẩu chưa đúng.";

    return;
  }


  const user = data.user;


  if (!user) {

    message.textContent =
      "Không xác định được tài khoản.";

    return;
  }


  /* ================================
     2. ĐỌC ROLE
  ================================= */

  const {
    data: profile,
    error: profileError
  } =
    await supabaseClient
      .from("profiles")
      .select(`
        email,
        full_name,
        role
      `)
      .eq(
        "id",
        user.id
      )
      .single();


  if (
    profileError ||
    !profile
  ) {

    console.error(profileError);

    message.textContent =
      "Không đọc được hồ sơ tài khoản.";

    return;
  }


  /* ================================
     3. CHUYỂN TRANG THEO ROLE
  ================================= */

  if (profile.role === "admin") {

    window.location.href =
      "/admin.html";

    return;
  }


  if (profile.role === "coach") {

    window.location.href =
      "/coach-sessions.html";

    return;
  }


  if (profile.role === "student") {

    window.location.href =
      "/student.html";

    return;
  }


  /* ================================
     ROLE KHÔNG HỢP LỆ
  ================================= */

  message.textContent =
    "Tài khoản chưa được phân quyền.";

});
