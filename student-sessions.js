const config =
  window.PICKDEE_CONFIG || {};

const sb =
  window.supabase.createClient(
    config.SUPABASE_URL,
    config.SUPABASE_PUBLISHABLE_KEY
  );


const body =
  document.getElementById("sessionBody");

const emptyEl =
  document.getElementById("empty");

const messageEl =
  document.getElementById("message");

const logoutBtn =
  document.getElementById("logoutBtn");


let currentStudent = null;
let registrations = [];
let sessions = [];


/* =====================================
   HELPERS
===================================== */

function show(id, value) {

  const el =
    document.getElementById(id);

  if (!el) return;

  el.textContent =
    value;
}


function escapeHTML(value) {

  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function one(value) {

  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value || null;
}


function dateVN(value) {

  if (!value) return "—";

  const text =
    String(value);

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

  return text;
}


function timeVN(value) {

  if (!value) return "—";

  return String(value)
    .slice(0, 5);
}


/* =====================================
   LẤY TỔNG SỐ BUỔI TỪ TÊN GÓI
===================================== */

function getPackageTotal(packageName) {

  if (!packageName) {
    return null;
  }

  const match =
    String(packageName)
      .match(/(\d+)\s*buổi/i);

  if (!match) {
    return null;
  }

  return Number(match[1]);
}


/* =====================================
   LOGIN STUDENT
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
    session.user.email || ""
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
   HỒ SƠ HỌC VIÊN
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

  return true;
}


/* =====================================
   ĐĂNG KÝ CỦA HỌC VIÊN
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
        package_name,
        status
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

    throw error;
  }


  registrations =
    data || [];
}


/* =====================================
   LỊCH HỌC
===================================== */

async function loadSessions() {

  if (
    registrations.length === 0
  ) {

    sessions = [];

    render();

    return;
  }


  const registrationIds =
    registrations.map(
      row => row.id
    );


  const {
    data,
    error
  } =
    await sb
      .from("class_sessions")
      .select(`
        id,
        session_code,
        registration_id,
        coach_id,
        session_no,
        session_date,
        start_time,
        duration_minutes,
        court_name,
        status,
        coaches (
          id,
          coach_code,
          full_name
        )
      `)
      .in(
        "registration_id",
        registrationIds
      )
      .order(
        "session_date",
        { ascending: true }
      )
      .order(
        "start_time",
        { ascending: true }
      );


  if (error) {

    throw error;
  }


  sessions =
    data || [];


  render();
}


/* =====================================
   TỔNG HỢP
===================================== */

function renderSummary() {

  /*
    VẮNG vẫn trừ buổi theo quy trình PickDee,
    nên "Đã sử dụng" gồm:
    - Đã hoàn thành
    - Vắng
  */

  const used =
    sessions.filter(
      row =>
        row.status === "Đã hoàn thành" ||
        row.status === "Vắng"
    ).length;


  let total = 0;
  let hasUnlimited = false;


  registrations.forEach(row => {

    const packageTotal =
      getPackageTotal(
        row.package_name
      );


    if (packageTotal === null) {

      hasUnlimited = true;

    } else {

      total += packageTotal;
    }

  });


  show(
    "usedSessions",
    used
  );


  if (hasUnlimited) {

    show(
      "totalSessions",
      "Theo yêu cầu"
    );

    show(
      "remainingSessions",
      "—"
    );

    return;
  }


  show(
    "totalSessions",
    total
  );


  show(
    "remainingSessions",
    Math.max(
      total - used,
      0
    )
  );
}


/* =====================================
   RENDER
===================================== */

function render() {

  renderSummary();


  if (
    sessions.length === 0
  ) {

    body.innerHTML = "";

    emptyEl.style.display =
      "block";

    return;
  }


  emptyEl.style.display =
    "none";


  body.innerHTML =
    sessions.map(row => {

      const coach =
        one(
          row.coaches
        );


      const coachText =
        coach?.full_name
          ? `${coach.full_name}${
              coach.coach_code
                ? ` (${coach.coach_code})`
                : ""
            }`
          : coach?.coach_code || "—";


      return `

        <tr>

          <td>
            <strong>
              ${escapeHTML(
                row.session_code ||
                "—"
              )}
            </strong>
          </td>

          <td>
            ${escapeHTML(
              row.session_no ||
              "—"
            )}
          </td>

          <td>
            ${dateVN(
              row.session_date
            )}
          </td>

          <td>
            ${timeVN(
              row.start_time
            )}
          </td>

          <td>
            ${escapeHTML(
              coachText
            )}
          </td>

          <td>
            ${escapeHTML(
              row.court_name ||
              "—"
            )}
          </td>

          <td>
            <span class="badge">
              ${escapeHTML(
                row.status ||
                "—"
              )}
            </span>
          </td>

        </tr>

      `;

    }).join("");
}


/* =====================================
   LOGOUT
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


    if (!session) return;


    const studentOK =
      await loadStudent(
        session.user.email
      );


    if (!studentOK) return;


    await loadRegistrations();

    await loadSessions();


  } catch (error) {

    console.error(error);

    messageEl.textContent =
      "Không tải được lịch học: " +
      (error.message || error);
  }
}


init();
