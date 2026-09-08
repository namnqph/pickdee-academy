const config =
  window.PICKDEE_CONFIG || {};

const supabaseClient =
  window.supabase.createClient(
    config.SUPABASE_URL,
    config.SUPABASE_PUBLISHABLE_KEY
  );

const params =
  new URLSearchParams(
    window.location.search
  );

const studentId =
  params.get("student_id");

let currentStudent = null;


/* ======================================
   KHỞI ĐỘNG
====================================== */

async function init() {

  if (!studentId) {
    alert("Thiếu ID học viên.");
    window.location.href = "./students.html";
    return;
  }

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

  await loadStudent();
}


/* ======================================
   ĐỌC THÔNG TIN HỌC VIÊN
====================================== */

async function loadStudent() {

  const {
    data,
    error
  } =
    await supabaseClient
      .from("students")
      .select(`
        id,
        student_code,
        full_name,
        preferred_area,
        preferred_ward
      `)
      .eq("id", studentId)
      .single();

  if (error || !data) {

    console.error(error);

    alert(
      "Không tải được học viên."
    );

    return;
  }

  currentStudent = data;

  document.getElementById(
    "studentName"
  ).textContent =
    data.full_name || "—";

  document.getElementById(
    "studentCode"
  ).textContent =
    data.student_code
      ? ` · ${data.student_code}`
      : "";

  document.getElementById(
    "preferredArea"
  ).value =
    data.preferred_area || "";

  document.getElementById(
    "preferredWard"
  ).value =
    data.preferred_ward || "";

  document.getElementById(
    "backLink"
  ).href =
    `./student-detail.html?id=${encodeURIComponent(studentId)}`;
}


/* ======================================
   TẠO ĐĂNG KÝ
====================================== */

document
  .getElementById(
    "registrationForm"
  )
  .addEventListener(
    "submit",
    async event => {

      event.preventDefault();

      const saveBtn =
        document.getElementById(
          "saveBtn"
        );

      const message =
        document.getElementById(
          "message"
        );

      message.textContent = "";
      message.className = "message";

      const packageName =
        document.getElementById(
          "packageName"
        ).value.trim();

      const preferredArea =
        document.getElementById(
          "preferredArea"
        ).value.trim();

      const preferredWard =
        document.getElementById(
          "preferredWard"
        ).value.trim();

      const referralCode =
        document.getElementById(
          "referralCode"
        ).value.trim();

      const note =
        document.getElementById(
          "note"
        ).value.trim();

      if (!packageName) {

        message.textContent =
          "Hãy chọn gói học.";

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
          .from("registrations")
          .insert({
            student_id:
              Number(studentId),

            package_name:
              packageName,

            preferred_area:
              preferredArea || null,

            preferred_ward:
              preferredWard || null,

            status:
              "Mới đăng ký",

            source:
              "Admin Web",

            referral_code:
              referralCode || null,

            note:
              note || null
          })
          .select(
            "id, registration_code"
          )
          .single();

      if (error) {

        console.error(error);

        message.textContent =
          "Không tạo được đăng ký: " +
          error.message;

        message.className =
          "message error";

        saveBtn.disabled = false;

        saveBtn.textContent =
          "TẠO ĐĂNG KÝ HỌC";

        return;
      }

      message.textContent =
        "Đã tạo đăng ký " +
        data.registration_code;

      message.className =
        "message success";

      setTimeout(() => {

        window.location.href =
          `./student-detail.html?id=${encodeURIComponent(studentId)}`;

      }, 700);
    }
  );


init();
