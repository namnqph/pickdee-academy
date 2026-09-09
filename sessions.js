const cfg = window.PICKDEE_CONFIG;

const sb = supabase.createClient(
  cfg.SUPABASE_URL,
  cfg.SUPABASE_PUBLISHABLE_KEY
);

const body = document.getElementById("sessionsBody");
const searchInput = document.getElementById("search");
const userEmail = document.getElementById("userEmail");

let allSessions = [];

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("vi-VN").format(
    new Date(`${value}T00:00:00`)
  );
}

function formatTime(value) {
  if (!value) return "—";
  return String(value).slice(0, 5);
}

async function checkLogin() {
  const {
    data: { session }
  } = await sb.auth.getSession();

  if (!session) {
    location.replace("./login.html");
    return false;
  }

  if (userEmail) {
    userEmail.textContent = session.user.email || "";
  }

  return true;
}

function renderSessions(rows) {
  if (!rows.length) {
    body.innerHTML = `
      <tr>
        <td colspan="8">Chưa có lịch học.</td>
      </tr>
    `;
    return;
  }

  body.innerHTML = rows
    .map((item) => {
      const registration = item.registrations || {};
      const student = registration.students || {};
      const coach = item.coaches || {};

      const studentName =
        student.full_name ||
        student.student_code ||
        "—";

      const coachName =
        coach.full_name
          ? `${coach.full_name}${
              coach.coach_code
                ? ` (${coach.coach_code})`
                : ""
            }`
          : "—";

      return `
        <tr>
          <td>
            <strong>${escapeHtml(item.session_code)}</strong>
          </td>

          <td>
            ${escapeHtml(studentName)}
          </td>

          <td>
            ${escapeHtml(coachName)}
          </td>

          <td>
            ${escapeHtml(item.session_no)}
          </td>

          <td>
            ${escapeHtml(formatDate(item.session_date))}
          </td>

          <td>
            ${escapeHtml(formatTime(item.start_time))}
          </td>

          <td>
            ${escapeHtml(item.court_name || "—")}
          </td>

          <td>
            <span class="badge">
              ${escapeHtml(item.status || "—")}
            </span>
          </td>
        </tr>
      `;
    })
    .join("");
}

async function loadSessions() {
  body.innerHTML = `
    <tr>
      <td colspan="8">Đang tải lịch học...</td>
    </tr>
  `;

  const { data, error } = await sb
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
        registration_code,
        student_id,
        students (
          id,
          student_code,
          full_name
        )
      ),
      coaches (
        id,
        coach_code,
        full_name
      )
    `)
    .order("session_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) {
    console.error(error);

    body.innerHTML = `
      <tr>
        <td colspan="8">
          Không tải được lịch học:
          ${escapeHtml(error.message || error)}
        </td>
      </tr>
    `;

    return;
  }

  allSessions = data || [];
  renderSessions(allSessions);
}

searchInput?.addEventListener("input", () => {
  const keyword =
    searchInput.value
      .trim()
      .toLowerCase();

  if (!keyword) {
    renderSessions(allSessions);
    return;
  }

  const filtered = allSessions.filter((item) => {
    const registration = item.registrations || {};
    const student = registration.students || {};
    const coach = item.coaches || {};

    const text = [
      item.session_code,
      item.session_no,
      item.session_date,
      item.start_time,
      item.court_name,
      item.status,
      registration.registration_code,
      student.student_code,
      student.full_name,
      coach.coach_code,
      coach.full_name
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return text.includes(keyword);
  });

  renderSessions(filtered);
});

async function init() {
  const ok = await checkLogin();

  if (!ok) return;

  await loadSessions();
}

init();
