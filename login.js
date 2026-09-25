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
    document.getElementById("email").value.trim();

  const password =
    document.getElementById("password").value;

  const { data, error } =
    await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

  if (error) {

    message.textContent =
      "Email hoặc mật khẩu chưa đúng.";

    return;
  }

  const user = data.user;

  const {
    data: profile,
    error: profileError
  } =
    await supabaseClient
      .from("profiles")
      .select("email, full_name, role")
      .eq("id", user.id)
      .single();

if (profileError || !profile) {

  const accountType =
    String(
      user?.user_metadata?.account_type
      ||
      ""
    );

  if (
    accountType ===
    "coach_application"
  ) {

    message.textContent =
      "Hồ sơ Coach của bạn đang chờ Admin duyệt. Bạn chỉ có thể đăng nhập khu vực Coach sau khi hồ sơ được phê duyệt.";

  } else {

    message.textContent =
      "Không đọc được hồ sơ tài khoản.";

  }

  return;

}
  if (profile.role === "admin") {

    window.location.href = "/admin";

  } else if (profile.role === "coach") {

    window.location.href = "/coach";

  } else if (profile.role === "student") {

    window.location.href = "/student";

  } else {

    message.textContent =
      "Tài khoản chưa được phân quyền.";

  }

});
