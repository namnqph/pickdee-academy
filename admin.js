const config = window.PICKDEE_CONFIG;

const supabaseClient = supabase.createClient(
  config.SUPABASE_URL,
  config.SUPABASE_PUBLISHABLE_KEY
);

async function startAdmin() {

  const { data: sessionData } =
    await supabaseClient.auth.getSession();

  const session = sessionData.session;

  if (!session) {
    window.location.href = "/login.html";
    return;
  }

  const user = session.user;

  const { data: profile, error } =
    await supabaseClient
      .from("profiles")
      .select("email, full_name, role")
      .eq("id", user.id)
      .single();

  if (error || !profile) {
    console.error(error);

    document.getElementById("loading").textContent =
      "Không đọc được hồ sơ Admin.";

    return;
  }

  if (profile.role !== "admin") {

    /* Không đăng xuất: /login còn phiên sẽ tự chuyển về đúng trang theo vai trò */
    window.location.href = "/login.html";

    return;
  }

  document.getElementById("adminEmail").textContent =
    profile.email || user.email;

  document.getElementById("loading").style.display =
    "none";

  document.getElementById("app").style.display =
    "block";
}

document
  .getElementById("logoutBtn")
  .addEventListener(
    "click",
    async () => {

      try {

        const logoutBtn =
          document.getElementById(
            "logoutBtn"
          );

        logoutBtn.disabled =
          true;

        logoutBtn.textContent =
          "Đang đăng xuất...";


        await supabaseClient.auth
          .signOut();


        /*
          Quay về trang chủ và ép trình duyệt
          lấy phiên bản mới thay vì cache cũ
        */

        window.location.replace(
          "/?v=" + Date.now()
        );

      }
      catch (error) {

        console.error(
          "LOGOUT ERROR:",
          error
        );

        const logoutBtn =
          document.getElementById(
            "logoutBtn"
          );

        logoutBtn.disabled =
          false;

        logoutBtn.textContent =
          "Đăng xuất";

      }

    }
  );

startAdmin();
