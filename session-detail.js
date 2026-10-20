const cfg = window.PICKDEE_CONFIG;

const sb = supabase.createClient(
  cfg.SUPABASE_URL,
  cfg.SUPABASE_PUBLISHABLE_KEY
);

const params =
  new URLSearchParams(window.location.search);

const sessionId =
  Number(params.get("id"));

const userEmail =
  document.getElementById("userEmail");

const completeBtn =
  document.getElementById("completeBtn");

const absentBtn =
  document.getElementById("absentBtn");

const messageEl =
  document.getElementById("message");

let currentSession = null;


function one(value) {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value || null;
}


function show(id, value) {
  const el = document.getElementById(id);

  if (!el) return;

  el.textContent =
    value === null ||
    value === undefined ||
    value === ""
      ? "—"
      : value;
}


function formatDate(value) {
  if (!value) return "—";

  return new Intl.DateTimeFormat(
    "vi-VN"
  ).format(
    new Date(`${value}T00:00:00`)
  );
}


function formatTime(value) {
  if (!value) return "—";

  return String(value).slice(0, 5);
}


function message(text, error = false) {
  if (!messageEl) return;

  messageEl.textContent = text;

  messageEl.style.color =
    error ? "#ff8a8a" : "#ffbb00";
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
    userEmail.textContent =
      session.user.email || "";
  }

  return true;
}


function updateButtons() {
  if (!completeBtn || !absentBtn) {
    return;
  }

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

  if (finished) {
    completeBtn.disabled = true;
    absentBtn.disabled = true;
  } else {
    completeBtn.disabled = false;
    absentBtn.disabled = false;

    completeBtn.removeAttribute("disabled");
    absentBtn.removeAttribute("disabled");
  }
}

  const status =
    currentSession.status || "";

  const finished =
    status === "Đã hoàn thành" ||
    status === "Vắng";

  completeBtn.disabled = finished;
  absentBtn.disabled = finished;
}


async function loadSession() {
  if (!sessionId) {
    alert("Không tìm thấy ID buổi học.");
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

    alert(
      "Không tải được buổi học: " +
      (error?.message || "")
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

  const ok =
    window.confirm(confirmText);

  if (!ok) return;

  completeBtn.disabled = true;
  absentBtn.disabled = true;

  message("Đang xử lý...");

  const { data, error } =
    await sb.rpc(
      "mark_session_result",
      {
        p_session_id:
          currentSession.id,

        p_result:
          nextStatus
      }
    );

  if (error) {
    console.error(error);

    message(
      "Không xử lý được buổi học: " +
      (error.message || error),
      true
    );

    completeBtn.disabled = false;
    absentBtn.disabled = false;

    return;
  }

  currentSession.status =
    nextStatus;

  show(
    "status",
    nextStatus
  );

  if (nextStatus === "Đã hoàn thành") {
    message(
      "Đã hoàn thành buổi học, ghi Có mặt và tạo Công Coach."
    );
  } else {
    message(
      "Đã ghi học viên Vắng."
    );
  }

  updateButtons();
}


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


async function init() {
  const ok = await checkLogin();

  if (!ok) return;

  await loadSession();

  updateButtons();
}


init();
