const config =
  window.PICKDEE_CONFIG || {};

const supabaseClient =
  window.supabase.createClient(
    config.SUPABASE_URL,
    config.SUPABASE_PUBLISHABLE_KEY
  );


async function init() {

  const {
    data: { session }
  } =
    await supabaseClient.auth.getSession();

  if (!session) {
    window.location.href = "./login.html";
    return;
  }

  document.getElementById(
    "userEmail"
  ).textContent =
    session.user.email || "";

  const {
    data: profile,
    error: profileError
  } =
    await supabaseClient
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single();

  if (
    profileError ||
    !profile ||
    profile.role !== "admin"
  ) {
    window.location.href =
      "./login.html";
    return;
  }
}


document
  .getElementById("coachForm")
  .addEventListener(
    "submit",
    async event => {

      event.preventDefault();

      const saveBtn =
        document.getElementById("saveBtn");

      const message =
        document.getElementById("message");

      message.textContent = "";
      message.className = "message";

      const fullName =
        document.getElementById(
          "fullName"
        ).value.trim();

      const phone =
        document.getElementById(
          "phone"
        ).value.trim();

      const email =
        document.getElementById(
          "email"
        ).value.trim();

      const preferredArea =
        document.getElementById(
          "preferredArea"
        ).value.trim();

      const preferredWard =
        document.getElementById(
          "preferredWard"
        ).value.trim();

      const status =
        document.getElementById(
          "status"
        ).value;

      const note =
        document.getElementById(
          "note"
        ).value.trim();

      if (!fullName) {

        message.textContent =
          "Hãy nhập họ và tên Coach.";

        message.className =
          "message error";

        return;
      }

      saveBtn.disabled = true;
      saveBtn.textContent =
        "ĐANG LƯU...";

      const {
        data,
        error
      } =
        await supabaseClient
          .from("coaches")
          .insert({
            full_name: fullName,
            phone: phone || null,
            email: email || null,
            preferred_area:
              preferredArea || null,
            preferred_ward:
              preferredWard || null,
            status: status,
            note: note || null
          })
          .select(
            "id, coach_code, full_name"
          )
          .single();

      if (error) {

        console.error(error);

        message.textContent =
          "Không lưu được Coach: " +
          error.message;

        message.className =
          "message error";

        saveBtn.disabled = false;
        saveBtn.textContent =
          "LƯU COACH";

        return;
      }

      message.textContent =
        `Đã tạo ${data.coach_code} - ${data.full_name}`;

      message.className =
        "message success";

      setTimeout(() => {

        window.location.href =
          "./coaches.html";

      }, 700);
    }
  );


init();
