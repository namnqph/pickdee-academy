const config =
  window.PICKDEE_CONFIG || {};

const sb =
  window.supabase.createClient(
    config.SUPABASE_URL,
    config.SUPABASE_PUBLISHABLE_KEY
  );


const messageEl =
  document.getElementById("message");

const listEl =
  document.getElementById("registrationList");

const emptyEl =
  document.getElementById("empty");

const logoutBtn =
  document.getElementById("logoutBtn");


let currentStudent = null;


/* =====================================
   HELPERS
===================================== */

function show(id, value) {

  const el =
    document.getElementById(id);

  if (!el) return;

  el.textContent =
    value || "—";
}


function escapeHTML(value) {

  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function dateVN(value) {

  if (!value) {
    return "—";
  }

  const text =
    String(value);

  /*
    Với cột DATE như:
    2026-10-16

    Không dùng new Date trực tiếp
    để tránh lệch ngày do timezone.
  */

  if (
    /^\d{4}-\d{2}-\d{2}$/.test(text)
  ) {

    const [
      year,
      month,
      day
    ] =
      text.split("-");

    return `${day}/${month}/${year}`;
  }


  return new Intl.DateTimeFormat(
    "vi-VN",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    }
  ).format(
    new Date(value)
  );
}


/* =====================================
   TÍNH SỐ NGÀY CÒN LẠI
===================================== */

function getRemainingDays(endDate) {

  if (!endDate) {
    return null;
  }


  const [
    year,
    month,
    day
  ] =
    String(endDate)
      .split("-")
      .map(Number);


  const end =
    Date.UTC(
      year,
      month - 1,
      day
    );


  const now =
    new Date();


  const today =
    Date.UTC(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );


  return Math.ceil(
    (end - today) /
    (1000 * 60 * 60 * 24)
  );
}


function getExpiryText(endDate) {

  if (!endDate) {

    return {
      text: "Không giới hạn",
      color: "#ffc934"
    };
  }


  const days =
    getRemainingDays(endDate);


  if (days < 0) {

    return {
      text: "Đã hết hạn",
      color: "#ff9d9d"
    };
  }


  if (days === 0) {

    return {
      text: "Hết hạn hôm nay",
      color: "#ffcf70"
    };
  }


  if (days <= 7) {

    return {
      text:
        `Còn ${days} ngày · Sắp hết hạn`,
      color: "#ffcf70"
    };
  }


  return {
    text:
      `Còn ${days} ngày`,
    color: "#ffc934"
  };
}


/* =====================================
   KIỂM TRA TÀI KHOẢN STUDENT
===================================== */

async function checkStudent() {

  const {
    data: { session }
  } =
    await sb.auth.getSession();


  if (!session) {

    location.replace(
      "./login.html"
    );

    return null;
  }


  show(
    "userEmail",
    session.user.email
  );


  const {
    data: profile,
    error
  } =
    await sb
      .from("profiles")
      .select("role")
      .eq(
        "id",
        session.user.id
      )
      .single();


  if (
    error ||
    !profile ||
    profile.role !== "student"
  ) {

    location.replace(
      "./login.html"
    );

    return null;
  }


  return session;
}


/* =====================================
   TÌM HỌC VIÊN THEO EMAIL LOGIN
===================================== */

async function loadStudent(email) {

  const {
    data,
    error
  } =
    await sb
      .from("students")
      .select(`
        id,
        student_code,
        full_name,
        email
      `)
      .eq(
        "email",
        email
      )
      .maybeSingle();


  if (
    error ||
    !data
  ) {

    console.error(error);

    messageEl.textContent =
      "Không tìm thấy hồ sơ học viên.";

    return false;
  }


  currentStudent = data;


  show(
    "studentName",
    data.full_name
  );

  show(
    "studentCode",
    data.student_code
  );


  return true;
}


/* =====================================
   LOAD GÓI HỌC CỦA CHÍNH HỌC VIÊN
===================================== */

async function loadRegistrations() {

  const {
    data,
    error
  } =
    await sb
      .from("registrations")
      .select(`
        id,
        registration_code,
        student_id,
        package_name,
        preferred_area,
        preferred_ward,
        status,
        source,
        referral_code,
        start_date,
        end_date,
        created_at
      `)
      .eq(
        "student_id",
        currentStudent.id
      )
      .order(
        "created_at",
        { ascending: false }
      );


  if (error) {

    console.error(error);

    messageEl.textContent =
      "Không tải được gói học: " +
      error.message;

    return;
  }


  const registrations =
    data || [];


  if (
    registrations.length === 0
  ) {

    listEl.innerHTML = "";

    emptyEl.style.display =
      "block";

    return;
  }


  emptyEl.style.display =
    "none";


  listEl.innerHTML =
    registrations
      .map(row => {

        const expiry =
          getExpiryText(
            row.end_date
          );


        return `

        <section class="registration">

          <div class="registration-top">

            <div>

              <div class="registration-code">
                ${escapeHTML(
                  row.registration_code ||
                  "—"
                )}
              </div>

              <div class="package-name">
                ${escapeHTML(
                  row.package_name ||
                  "—"
                )}
              </div>

            </div>

            <span class="badge">
              ${escapeHTML(
                row.status ||
                "—"
              )}
            </span>

          </div>


          <div class="grid">

            <div>

              <div class="label">
                Ngày đăng ký
              </div>

              <div class="value">
                ${dateVN(
                  row.created_at
                )}
              </div>

            </div>


            <div>

              <div class="label">
                Ngày bắt đầu
              </div>

              <div class="value">
                ${dateVN(
                  row.start_date
                )}
              </div>

            </div>


            <div>

              <div class="label">
                Hạn gói
              </div>

              <div class="value">
                ${dateVN(
                  row.end_date
                )}
              </div>

            </div>


            <div>

              <div class="label">
                Thời gian còn lại
              </div>

              <div
                class="value"
                style="
                  color:${expiry.color};
                "
              >
                ${escapeHTML(
                  expiry.text
                )}
              </div>

            </div>


            <div>

              <div class="label">
                Nguồn
              </div>

              <div class="value">
                ${escapeHTML(
                  row.source ||
                  "—"
                )}
              </div>

            </div>


            <div>

              <div class="label">
                Khu vực muốn học
              </div>

              <div class="value">
                ${escapeHTML(
                  row.preferred_area ||
                  "—"
                )}
              </div>

            </div>


            <div>

              <div class="label">
                Xã/Phường muốn học
              </div>

              <div class="value">
                ${escapeHTML(
                  row.preferred_ward ||
                  "—"
                )}
              </div>

            </div>


            <div>

              <div class="label">
                Mã giới thiệu
              </div>

              <div class="value">
                ${escapeHTML(
                  row.referral_code ||
                  "—"
                )}
              </div>

            </div>

          </div>

        </section>

      `;

      })
      .join("");
}


/* =====================================
   ĐĂNG XUẤT
===================================== */

logoutBtn.addEventListener(
  "click",
  async () => {

    logoutBtn.disabled = true;

    logoutBtn.textContent =
      "Đang đăng xuất...";


    await sb.auth.signOut();


    location.replace(
      "./login.html"
    );
  }
);


/* =====================================
   START
===================================== */

async function init() {

  try {

    const session =
      await checkStudent();


    if (!session) {
      return;
    }


    const studentOK =
      await loadStudent(
        session.user.email
      );


    if (!studentOK) {
      return;
    }


    await loadRegistrations();


  } catch (error) {

    console.error(error);

    messageEl.textContent =
      "Có lỗi khi tải gói học: " +
      (error.message || error);
  }
}


init();
