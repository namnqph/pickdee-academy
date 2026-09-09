const cfg =
  window.PICKDEE_CONFIG || {};

const sb =
  window.supabase.createClient(
    cfg.SUPABASE_URL,
    cfg.SUPABASE_PUBLISHABLE_KEY
  );


const params =
  new URLSearchParams(
    window.location.search
  );

const sessionId =
  Number(
    params.get("id") || 0
  );


const messageEl =
  document.getElementById(
    "message"
  );

const completeBtn =
  document.getElementById(
    "completeBtn"
  );

const absentBtn =
  document.getElementById(
    "absentBtn"
  );


let currentCoach = null;
let currentSession = null;


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


function one(value) {

  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value || null;
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


/* =====================================
   LOGIN COACH
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
    profile.role !== "coach"
  ) {

    alert(
      "Trang này chỉ dành cho Coach."
    );

    location.replace(
      "./login.html"
    );

    return null;
  }


  return session;
}


/* =====================================
   LOAD COACH
===================================== */

async function loadCoach(email) {

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
      "Không tìm thấy hồ sơ Coach.";

    return false;
  }


  currentCoach =
    data;


  show(
    "coachLine",
    `${data.full_name} · ${data.coach_code}`
  );


  return true;
}


/* =====================================
   LOAD SESSION
===================================== */

async function loadSession() {

  if (!sessionId) {

    messageEl.textContent =
      "Không tìm thấy ID buổi học.";

    return false;
  }


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
        "id",
        sessionId
      )
      .eq(
        "coach_id",
        currentCoach.id
      )
      .maybeSingle();


  if (error) {

    console.error(error);

    messageEl.textContent =
      "Không tải được buổi học: " +
      error.message;

    return false;
  }


  if (!data) {

    messageEl.textContent =
      "Bạn không có quyền xem buổi học này.";

    return false;
  }


  currentSession =
    data;


  const registration =
    one(
      data.registrations
    );

  const student =
    one(
      registration?.students
    );


  show(
    "sessionCode",
    data.session_code
  );

  show(
    "studentName",
    student?.full_name ||
    student?.student_code
  );

  show(
    "sessionNo",
    String(data.session_no)
  );

  show(
    "status",
    data.status
  );

  show(
    "sessionDate",
    dateVN(data.session_date)
  );

  show(
    "startTime",
    String(
      data.start_time || ""
    ).slice(0, 5)
  );

  show(
    "duration",
    `${data.duration_minutes} phút`
  );

  show(
    "courtName",
    data.court_name
  );

  show(
    "note",
    data.note
  );


  /*
    Hiện tại Coach mới có SELECT.
    Chưa bật thao tác UPDATE.
  */

  if (
  data.status === "Chờ học"
) {

  completeBtn.disabled = false;
  absentBtn.disabled = false;

  messageEl.textContent =
    "Buổi học đang Chờ học. Bạn có thể điểm danh.";

} else {

  completeBtn.disabled = true;
  absentBtn.disabled = true;

  messageEl.textContent =
    `Buổi học đã được xử lý: ${data.status}`;
}

  return true;
}

/* =====================================
   ĐIỂM DANH BUỔI HỌC
===================================== */

async function markSession(action) {

  if (!currentSession) {
    return;
  }

  const isComplete =
    action === "completed";


  const confirmText =
    isComplete
      ? "Xác nhận HOÀN THÀNH buổi học này?"
      : "Xác nhận học viên VẮNG buổi này?";


  if (!window.confirm(confirmText)) {
    return;
  }


  completeBtn.disabled = true;
  absentBtn.disabled = true;

  messageEl.textContent =
    "Đang xử lý...";


  const {
    data,
    error
  } =
    await sb.rpc(
      "coach_mark_session",
      {
        p_session_id:
          currentSession.id,

        p_action:
          action
      }
    );


  if (error) {

    console.error(error);

    messageEl.textContent =
      "Không xử lý được buổi học: " +
      error.message;

    completeBtn.disabled = false;
    absentBtn.disabled = false;

    return;
  }


  messageEl.textContent =
    isComplete
      ? "✓ Đã hoàn thành buổi học."
      : "✓ Đã ghi nhận học viên vắng.";


  setTimeout(() => {

    location.reload();

  }, 700);
}


completeBtn.addEventListener(
  "click",
  () => markSession("completed")
);


absentBtn.addEventListener(
  "click",
  () => markSession("absent")
);
/* =====================================
   START
===================================== */

async function init() {

  try {

    const loginSession =
      await checkCoachLogin();


    if (!loginSession) {
      return;
    }


    const coachLoaded =
      await loadCoach(
        loginSession.user.email
      );


    if (!coachLoaded) {
      return;
    }


    await loadSession();


  } catch (error) {

    console.error(error);

    messageEl.textContent =
      "Có lỗi khi tải chi tiết buổi học: " +
      (error.message || error);
  }
}


init();
