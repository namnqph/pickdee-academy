const cfg =
  window.PICKDEE_CONFIG || {};

const sb =
  window.supabase.createClient(
    cfg.SUPABASE_URL,
    cfg.SUPABASE_PUBLISHABLE_KEY
  );


const body =
  document.getElementById(
    "sessionBody"
  );

const emptyEl =
  document.getElementById(
    "empty"
  );

const messageEl =
  document.getElementById(
    "message"
  );

const searchInput =
  document.getElementById(
    "search"
  );


const logoutBtn =
  document.getElementById(
    "logoutBtn"
  );


logoutBtn.addEventListener(
  "click",
  async () => {

    logoutBtn.disabled = true;


    const { error } =
      await sb.auth.signOut();


    if (error) {

      console.error(error);

      messageEl.textContent =
        "Không đăng xuất được. Vui lòng thử lại.";

      logoutBtn.disabled = false;

      return;
    }


    window.location.replace(
      "/login.html"
    );
  }
);


let currentCoach = null;
let sessions = [];


/* =====================================
   HELPER
===================================== */

function show(
  id,
  value
) {

  const el =
    document.getElementById(id);

  if (!el) return;

  el.textContent =
    value || "—";
}


function dateVN(value) {

  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "vi-VN",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    }
  ).format(
    new Date(
      `${value}T00:00:00`
    )
  );
}


function todayISO() {

  const now =
    new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      now.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}


function one(value) {

  if (
    Array.isArray(value)
  ) {
    return value[0] || null;
  }

  return value || null;
}


function escapeHTML(value) {

  return String(
    value ?? ""
  )
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


/* =====================================
   KIỂM TRA LOGIN + ROLE COACH
===================================== */

async function checkCoachLogin() {

  const {
    data: { session }
  } =
    await sb.auth.getSession();


  if (!session) {

    location.replace(
      "./login.html"
    );

    return false;
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
    profile.role !== "coach"
  ) {

    alert(
      "Trang này chỉ dành cho Coach."
    );

    location.replace(
      "./login.html"
    );

    return false;
  }


  return session;
}


/* =====================================
   TÌM COACH THEO EMAIL ĐĂNG NHẬP
===================================== */

async function loadCurrentCoach(
  email
) {

  const {
    data,
    error
  } =
    await sb
      .from("coaches")
      .select(`
        id,
        coach_code,
        full_name,
        email,
        status
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
      "Không tìm thấy hồ sơ Coach gắn với tài khoản này.";

    return false;
  }


  currentCoach =
    data;


  show(
    "coachName",
    data.full_name
  );


  show(
    "coachCode",
    `${data.coach_code} · ${data.status}`
  );


  return true;
}


/* =====================================
   LOAD LỊCH DẠY
===================================== */

async function loadSessions() {

  body.innerHTML = `
    <tr>
      <td colspan="7">
        Đang tải lịch dạy...
      </td>
    </tr>
  `;


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
        note,
        registrations (
          id,
          student_id,
          students (
            id,
            student_code,
            full_name
          )
        )
      `)
      .eq(
        "coach_id",
        currentCoach.id
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

    console.error(
      error
    );

    body.innerHTML = `
      <tr>
        <td colspan="7">
          Không tải được lịch dạy.
        </td>
      </tr>
    `;

    messageEl.textContent =
      error.message || String(error);

    return;
  }


  sessions =
    data || [];


  renderSessions(
    sessions
  );
}


/* =====================================
   RENDER
===================================== */

function renderSessions(
  rows
) {

  if (
    !rows ||
    rows.length === 0
  ) {

    body.innerHTML = "";

    emptyEl.style.display =
      "block";

    return;
  }


  emptyEl.style.display =
    "none";


  const today =
    todayISO();


  body.innerHTML =
    rows
      .map(
        session => {

          const registration =
            one(
              session.registrations
            );

          const student =
            one(
              registration?.students
            );


          const studentText =
            student?.full_name ||
            student?.student_code ||
            "—";


          const isToday =
            session.session_date ===
            today;


          return `
  <tr
    style="cursor:pointer"
    onclick="window.location.href='./coach-session-detail.html?id=${session.id}'"
    title="Mở chi tiết buổi học"
  >
    <td>
      <strong>
        ${escapeHTML(
          session.session_code
        )}
      </strong>
    </td>

              <td>
                ${escapeHTML(
                  studentText
                )}
              </td>

              <td>
                ${escapeHTML(
                  session.session_no
                )}
              </td>

              <td class="${
                isToday
                  ? "today"
                  : ""
              }">
                ${dateVN(
                  session.session_date
                )}
                ${
                  isToday
                    ? " · Hôm nay"
                    : ""
                }
              </td>

              <td>
                ${escapeHTML(
                  String(
                    session.start_time ||
                    "—"
                  ).slice(0, 5)
                )}
              </td>

              <td>
                ${escapeHTML(
                  session.court_name ||
                  "—"
                )}
              </td>

              <td>
                <span class="badge">
                  ${escapeHTML(
                    session.status ||
                    "—"
                  )}
                </span>
              </td>
            </tr>
          `;
        }
      )
      .join("");
}


/* =====================================
   SEARCH
===================================== */

searchInput.addEventListener(
  "input",
  () => {

    const keyword =
      searchInput.value
        .trim()
        .toLowerCase();


    if (!keyword) {

      renderSessions(
        sessions
      );

      return;
    }


    const filtered =
      sessions.filter(
        session => {

          const registration =
            one(
              session.registrations
            );

          const student =
            one(
              registration?.students
            );


          const text = [
            session.session_code,
            student?.full_name,
            student?.student_code,
            session.session_no,
            session.session_date,
            session.start_time,
            session.court_name,
            session.status
          ]
            .join(" ")
            .toLowerCase();


          return text.includes(
            keyword
          );
        }
      );


    renderSessions(
      filtered
    );
  }
);


/* =====================================
   START
===================================== */

async function init() {

  try {

    const session =
      await checkCoachLogin();


    if (!session) {
      return;
    }


    const coachLoaded =
      await loadCurrentCoach(
        session.user.email
      );


    if (!coachLoaded) {
      return;
    }


    await loadSessions();


  } catch (error) {

    console.error(
      "Coach sessions error:",
      error
    );

    messageEl.textContent =
      "Có lỗi khi tải lịch Coach: " +
      (error.message || error);
  }
}


init();
