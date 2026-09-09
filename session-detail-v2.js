const cfg = window.PICKDEE_CONFIG;

const sb = window.supabase.createClient(
  cfg.SUPABASE_URL,
  cfg.SUPABASE_PUBLISHABLE_KEY
);

const params = new URLSearchParams(window.location.search);
const sessionId = Number(params.get("id"));

let currentSession = null;

function el(id) {
  return document.getElementById(id);
}

function one(value) {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value || null;
}

function show(id, value) {
  const node = el(id);

  if (!node) return;

  node.textContent =
    value === null ||
    value === undefined ||
    value === ""
      ? "—"
      : value;
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

function setMessage(text, isError = false) {
  const node = el("message");

  if (!node) return;

  node.textContent = text;
  node.style.color = isError
    ? "#ff8a8a"
    : "#b7ff00";
}

function updateButtons() {
  const completeBtn = el("completeBtn");
  const absentBtn = el("absentBtn");

  if (!completeBtn || !absentBtn) return;

  if (!currentSession) {
    completeBtn.disabled = true;
    absentBtn.disabled = true;
    return;
  }

  const status = String(
    currentSession.status || ""
  ).trim();

  const finished =
    status === "Đã hoàn thành" ||
    status === "Vắng";

  completeBtn.disabled = finished;
  absentBtn.disabled = finished;
}

async function checkLogin() {
  const {
    data: { session }
  } = await sb.auth.getSession();

  if (!session) {
    location.replace("./login.html");
    return false;
  }

  show(
    "userEmail",
    session.user.email || ""
  );

  return true;
}

async function loadSession() {
  if (!sessionId) {
    setMessage(
      "Không tìm thấy ID buổi học.",
      true
    );
    return;
  }

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
    .eq("id", sessionId)
    .single();

  if (error || !data) {
    console.error(error);

    setMessage(
      "Không tải được buổi học: " +
        (error?.message || "Không rõ lỗi"),
      true
    );

    return;
  }

  currentSession = data;

  const registration =
    one(data.registrations);

  const student =
    one(registration?.students);

  const coach =
    one(data.coaches);

  show(
    "sessionCode",
    data.session_code
  );

  show(
    "registrationLine",
    registration?.registration_code
      ? `Đăng ký: ${registration.registration_code}`
      : "—"
  );

  show(
    "studentName",
    student?.full_name ||
      student?.student_code
  );

  show(
    "coachName",
    coach?.full_name
      ? `${coach.full_name}${
          coach.coach_code
            ? ` (${coach.coach_code})`
            : ""
        }`
      : coach?.coach_code
  );

  show(
    "sessionNo",
    data.session_no
  );

  show(
    "status",
    data.status
  );

  show(
    "sessionDate",
    formatDate(data.session_date)
  );

  show(
    "startTime",
    formatTime(data.start_time)
  );

  show(
    "duration",
    data.duration_minutes
      ? `${data.duration_minutes} phút`
      : "—"
  );

  show(
    "courtName",
    data.court_name
  );

  show(
    "note",
    data.note
  );

  updateButtons();
}

async function changeStatus(
  nextStatus,
  confirmText
) {
  if (!currentSession) return;

  const ok = window.confirm(confirmText);

  if (!ok) return;

  el("completeBtn").disabled = true;
  el("absentBtn").disabled = true;

  setMessage("Đang xử lý...");

  const { error } = await sb.rpc(
    "mark_session_result",
    {
      p_session_id: currentSession.id,
      p_result: nextStatus
    }
  );

  if (error) {
    console.error(error);

    setMessage(
      "Không xử lý được buổi học: " +
        (error.message || error),
      true
    );

    updateButtons();
    return;
  }

  currentSession.status = nextStatus;

  show(
    "status",
    nextStatus
  );

  if (nextStatus === "Đã hoàn thành") {
    setMessage(
      "Đã hoàn thành buổi học, ghi Có mặt và tạo Công Coach."
    );
  } else {
    setMessage(
      "Đã ghi học viên Vắng."
    );
  }

  updateButtons();
}

async function init() {
  const completeBtn = el("completeBtn");
  const absentBtn = el("absentBtn");

  completeBtn.disabled = true;
  absentBtn.disabled = true;

  const ok = await checkLogin();

  if (!ok) return;

  await loadSession();

  completeBtn.addEventListener(
    "click",
    () => {
      changeStatus(
        "Đã hoàn thành",
        "Xác nhận học viên đã hoàn thành buổi học này?"
      );
    }
  );

  absentBtn.addEventListener(
    "click",
    () => {
      changeStatus(
        "Vắng",
        "Xác nhận học viên vắng buổi học này?"
      );
    }
  );

  updateButtons();
}

window.addEventListener(
  "DOMContentLoaded",
  init
);
