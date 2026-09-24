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


  messageEl.textContent =
    "Đang tải buổi học...";


  /* =====================================
     1. LOAD BUỔI HỌC
     Không dùng nested query nữa
  ====================================== */

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
        training_group_id,
        coach_id,
        substitute_coach_id,
        session_no,
        session_date,
        start_time,
        duration_minutes,
        court_id,
        court_name,
        court_cost,
        status,
        note
      `)
      .eq(
        "id",
        sessionId
      )
      .or(
        `coach_id.eq.${currentCoach.id},substitute_coach_id.eq.${currentCoach.id}`
      )
      .maybeSingle();


  if (error) {

    console.error(
      "LOAD SESSION ERROR:",
      error
    );

    messageEl.textContent =
      "Không tải được buổi học: "
      +
      error.message;

    return false;

  }


  if (!data) {

    messageEl.textContent =
      "Bạn không có quyền xem buổi học này.";

    return false;

  }


  /* =====================================
     2. XÁC ĐỊNH COACH THỰC TẾ DẠY

     Nếu đã có Coach hỗ trợ thì Coach hỗ trợ
     là người được thao tác, giống backend.
  ====================================== */

  const actualCoachId =
    Number(
      data.substitute_coach_id
      ||
      data.coach_id
      ||
      0
    );


  if (
    actualCoachId !==
    Number(currentCoach.id)
  ) {

    messageEl.textContent =
      "Buổi học này hiện do Coach khác phụ trách.";

    return false;

  }


  /* =====================================
     3. LẤY HỌC VIÊN
  ====================================== */

  let studentName =
    "—";

  let studentCode =
    "";


  if (data.training_group_id) {

    /*
      Buổi nhóm:
      lấy toàn bộ thành viên.
    */

    const {
      data: participantData,
      error: participantError
    } =
      await sb.rpc(
        "coach_get_session_participants",
        {
          p_session_id:
            data.id
        }
      );


    if (participantError) {

      console.warn(
        "LOAD GROUP PARTICIPANTS:",
        participantError
      );

    }
    else {

      const members =
        (
          participantData
          &&
          Array.isArray(
            participantData.members
          )
        )
          ?
          participantData.members
          :
          [];


      const names =
        [
          ...new Set(
            members
              .map(
                item =>
                  String(
                    item.student_name
                    ||
                    item.student_code
                    ||
                    ""
                  ).trim()
              )
              .filter(Boolean)
          )
        ];


      if (names.length > 0) {

        studentName =
          names.join(" + ");

      }

    }

  }
  else {

    /*
      Buổi cá nhân:
      load registration riêng trước.
    */

    const {
      data: registration,
      error: registrationError
    } =
      await sb
        .from("registrations")
        .select(`
          id,
          student_id
        `)
        .eq(
          "id",
          data.registration_id
        )
        .maybeSingle();


    if (registrationError) {

      console.error(
        "LOAD REGISTRATION ERROR:",
        registrationError
      );

      messageEl.textContent =
        "Không tải được đăng ký học: "
        +
        registrationError.message;

      return false;

    }


    if (
      registration
      &&
      registration.student_id
    ) {

      const {
        data: student,
        error: studentError
      } =
        await sb
          .from("students")
          .select(`
            id,
            student_code,
            full_name
          `)
          .eq(
            "id",
            registration.student_id
          )
          .maybeSingle();


      if (studentError) {

        console.error(
          "LOAD STUDENT ERROR:",
          studentError
        );

        messageEl.textContent =
          "Không tải được Học viên: "
          +
          studentError.message;

        return false;

      }


      if (student) {

        studentName =
          student.full_name
          ||
          student.student_code
          ||
          "—";

        studentCode =
          student.student_code
          ||
          "";

      }

    }

  }


  /* =====================================
     4. GÁN DỮ LIỆU HIỆN TẠI
  ====================================== */

  currentSession =
    data;


  /*
    Sửa luôn tiêu đề mặc định
    "Không tải được buổi học".
  */

  const pageTitle =
    document.querySelector("h1");


  if (pageTitle) {

    pageTitle.textContent =
      data.session_code
        ?
        `Chi tiết ${data.session_code}`
        :
        "Chi tiết buổi học";

  }


  show(
    "sessionCode",
    data.session_code
  );


  show(
    "studentName",
    studentName
  );


  show(
    "sessionNo",
    String(
      data.session_no
      ??
      "—"
    )
  );


  show(
    "status",
    data.status
  );


  show(
    "sessionDate",
    dateVN(
      data.session_date
    )
  );


  show(
    "startTime",
    String(
      data.start_time
      ||
      ""
    ).slice(
      0,
      5
    )
  );


  show(
    "duration",
    `${data.duration_minutes || 60} phút`
  );


  show(
    "courtName",
    data.court_name
    ||
    "Chưa chọn sân"
  );


  show(
    "note",
    data.note
  );


  /* =====================================
     5. TRẠNG THÁI NÚT
  ====================================== */

  if (
    data.status === "Chờ học"
  ) {

    /*
      Backend chỉ cho điểm danh
      sau khi buổi học kết thúc.
      Frontend hiển thị đúng quy tắc đó.
    */

    const startText =
      String(
        data.start_time
        ||
        "00:00:00"
      );


    const sessionStart =
      new Date(
        `${data.session_date}T${startText}+07:00`
      );


    const sessionEnd =
      new Date(
        sessionStart.getTime()
        +
        Number(
          data.duration_minutes
          ||
          60
        )
        *
        60
        *
        1000
      );


    if (
      Date.now() <
      sessionEnd.getTime()
    ) {

      completeBtn.disabled =
        true;

      absentBtn.disabled =
        true;


      messageEl.textContent =
        "Buổi học đang Chờ học. "
        +
        "Chỉ có thể điểm danh sau khi buổi học kết thúc.";

    }
    else {

      completeBtn.disabled =
        false;

      absentBtn.disabled =
        false;


      messageEl.textContent =
        "Buổi học đã đến thời điểm điểm danh.";

    }

  }
  else {

    completeBtn.disabled =
      true;

    absentBtn.disabled =
      true;


    messageEl.textContent =
      `Buổi học đã được xử lý: ${data.status}`;

  }


  console.log(
    "COACH SESSION DETAIL OK:",
    data,
    {
      studentName,
      studentCode,
      actualCoachId
    }
  );


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
