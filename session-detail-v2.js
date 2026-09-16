const cfg =
  window.PICKDEE_CONFIG;

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
    params.get("id")
  );


let currentSession =
  null;

let paymentGate =
  {
    checked: false,
    ready: false,
    isTest: false,
    message: ""
  };


function el(id) {

  return document.getElementById(
    id
  );

}


function one(value) {

  if (
    Array.isArray(value)
  ) {

    return value[0]
      ||
      null;

  }


  return value
    ||
    null;

}


function show(
  id,
  value
) {

  const node =
    el(id);


  if (!node) {

    return;

  }


  node.textContent =

    value === null
    ||
    value === undefined
    ||
    value === ""

      ? "—"

      : value;

}


function formatDate(value) {

  if (!value) {

    return "—";

  }


  return new Intl.DateTimeFormat(
    "vi-VN"
  ).format(

    new Date(
      `${value}T00:00:00`
    )

  );

}


function formatTime(value) {

  if (!value) {

    return "—";

  }


  return String(
    value
  ).slice(
    0,
    5
  );

}


function setMessage(
  text,
  isError = false
) {

  const node =
    el("message");


  if (!node) {

    return;

  }


  node.textContent =
    text;


  node.style.color =

    isError

      ? "#ff8a8a"

      : "#b7ff00";

}


/* =====================================================
   PAYMENT GATE UI
====================================================== */

function createPaymentGateUI() {

  if (
    document.getElementById(
      "paymentGateBox"
    )
  ) {

    return;

  }


  const style =
    document.createElement(
      "style"
    );


  style.textContent = `

    #paymentGateBox {
      display: none;
      margin-top: 18px;
      padding: 18px 20px;
      border-radius: 14px;
      border: 1px solid rgba(255,120,120,.32);
      background:
        linear-gradient(
          145deg,
          rgba(95,25,25,.42),
          rgba(13,43,88,.88)
        );
    }

    #paymentGateBox.show {
      display: block;
    }

    .payment-gate-title {
      color: #ffaaaa;
      font-size: 18px;
      font-weight: 900;
      margin-bottom: 8px;
    }

    .payment-gate-text {
      color: rgba(255,255,255,.76);
      font-size: 14px;
      line-height: 1.55;
    }

    .payment-gate-rule {
      margin-top: 11px;
      color: #ffd884;
      font-size: 13px;
      font-weight: 800;
      line-height: 1.5;
    }

    #paymentGateBox.test {
      border-color:
        rgba(183,255,0,.30);

      background:
        rgba(183,255,0,.06);
    }

    #paymentGateBox.test
    .payment-gate-title {
      color: #b7ff00;
    }

  `;


  document.head.appendChild(
    style
  );


  const box =
    document.createElement(
      "div"
    );


  box.id =
    "paymentGateBox";


  const grid =
    document.querySelector(
      ".grid"
    );


  if (grid) {

    grid.insertAdjacentElement(
      "afterend",
      box
    );

  }

}


function renderPaymentGate() {

  const box =
    el(
      "paymentGateBox"
    );


  if (!box) {

    return;

  }


  box.className =
    "";


  if (
    paymentGate.isTest
    &&
    paymentGate.ready
  ) {

    box.className =
      "show test";


    box.innerHTML = `

      <div class="payment-gate-title">
        🧪 BUỔI HỌC TEST
      </div>

      <div class="payment-gate-text">
        Đây là dữ liệu kiểm thử.
        Payment Gate cho phép tiếp tục thao tác.
      </div>

    `;


    return;

  }


  if (
    paymentGate.ready
  ) {

    box.style.display =
      "none";


    box.innerHTML =
      "";


    return;

  }


  box.style.display =
    "";


  box.className =
    "show";


  box.innerHTML = `

    <div class="payment-gate-title">
      🔒 HỌC VIÊN CHƯA ĐỦ HỌC PHÍ – CHƯA ĐƯỢC HỌC
    </div>

    <div class="payment-gate-text">

      Hệ thống chưa xác nhận học viên
      đã thanh toán đủ toàn bộ học phí
      của gói học này.

    </div>

    <div class="payment-gate-rule">

      Coach không được điểm danh,
      ghi Vắng hoặc hoàn thành buổi học
      cho đến khi PickDee xác nhận
      học phí đã được Đã thu đủ 100%.

    </div>

  `;

}


/* =====================================================
   BUTTON STATE
====================================================== */

function updateButtons() {

  const completeBtn =
    el(
      "completeBtn"
    );

  const absentBtn =
    el(
      "absentBtn"
    );


  if (
    !completeBtn
    ||
    !absentBtn
  ) {

    return;

  }


  if (
    !currentSession
    ||
    !paymentGate.checked
  ) {

    completeBtn.disabled =
      true;

    absentBtn.disabled =
      true;

    return;

  }


  if (
    !paymentGate.ready
  ) {

    completeBtn.disabled =
      true;

    absentBtn.disabled =
      true;

    return;

  }


  const status =
    String(
      currentSession.status
      ||
      ""
    ).trim();


  const finished =

    status ===
      "Đã hoàn thành"

    ||

    status ===
      "Vắng";


  completeBtn.disabled =
    finished;


  absentBtn.disabled =
    finished;

}


/* =====================================================
   AUTH
====================================================== */

async function checkLogin() {

  const {
    data: {
      session
    }
  } =
    await sb.auth
      .getSession();


  if (!session) {

    location.replace(
      "./login.html"
    );

    return false;

  }


  show(
    "userEmail",
    session.user.email
    ||
    ""
  );


  return true;

}


/* =====================================================
   PAYMENT GATE BACKEND
====================================================== */

async function checkPaymentGate() {

  paymentGate = {

    checked: false,

    ready: false,

    isTest: false,

    message:
      "Đang kiểm tra học phí..."

  };


  updateButtons();


  const {
    data,
    error
  } =
    await sb.rpc(
      "session_payment_gate_status",
      {
        p_session_id:
          sessionId
      }
    );


  if (error) {

    console.error(
      "PAYMENT GATE ERROR:",
      error
    );


    paymentGate = {

      checked: true,

      ready: false,

      isTest: false,

      message:
        error.message
        ||
        "Không xác minh được học phí."

    };


    renderPaymentGate();

    updateButtons();


    setMessage(
      "Không xác minh được học phí. Buổi học đang bị khóa để đảm bảo an toàn.",
      true
    );


    return false;

  }


  const result =
    one(
      data
    );


  if (!result) {

    paymentGate = {

      checked: true,

      ready: false,

      isTest: false,

      message:
        "Không xác định được trạng thái học phí."

    };


    renderPaymentGate();

    updateButtons();


    setMessage(
      "Không xác định được trạng thái học phí. Buổi học đang bị khóa.",
      true
    );


    return false;

  }


  paymentGate = {

    checked: true,

    ready:
      result.payment_ready
      ===
      true,

    isTest:
      result.is_test
      ===
      true,

    message:
      result.gate_message
      ||
      ""

  };


  renderPaymentGate();

  updateButtons();


  return paymentGate.ready;

}


/* =====================================================
   LOAD SESSION
====================================================== */

async function loadSession() {

  if (!sessionId) {

    setMessage(
      "Không tìm thấy ID buổi học.",
      true
    );

    return;

  }


  const {
    data,
    error
  } =
    await sb
      .from(
        "class_sessions"
      )
      .select(`
        id,
        session_code,
        registration_id,
        coach_id,
        substitute_coach_id,
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

        primary_coach:coaches!class_sessions_coach_id_fkey (
          id,
          coach_code,
          full_name
        ),

        substitute_coach:coaches!class_sessions_substitute_coach_id_fkey (
          id,
          coach_code,
          full_name
        )
      `)
      .eq(
        "id",
        sessionId
      )
      .single();


  if (
    error
    ||
    !data
  ) {

    console.error(
      error
    );


    setMessage(
      "Không tải được buổi học: "
      +
      (
        error?.message
        ||
        "Không rõ lỗi"
      ),
      true
    );


    return;

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


  const primaryCoach =
    one(
      data.primary_coach
    );


  const substituteCoach =
    one(
      data.substitute_coach
    );


  const coachNameNode =
    el(
      "coachName"
    );


  if (coachNameNode) {

    const coachItem =
      coachNameNode.closest(
        ".item"
      );


    const coachLabel =
      coachItem?.querySelector(
        ".label"
      );


    if (coachLabel) {

      coachLabel.textContent =
        "Coach chính";

    }


    if (
      !el(
        "substituteCoachName"
      )
      &&
      coachItem
    ) {

      const substituteItem =
        document.createElement(
          "div"
        );


      substituteItem.className =
        "item";


      substituteItem.innerHTML = `
        <div class="label">
          Coach hỗ trợ
        </div>

        <div
          class="value"
          id="substituteCoachName"
        >
          —
        </div>
      `;


      coachItem.insertAdjacentElement(
        "afterend",
        substituteItem
      );

    }

  }


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

    student?.full_name
    ||
    student?.student_code
  );


  show(
    "coachName",

    primaryCoach?.full_name

      ? `${primaryCoach.full_name}${
          primaryCoach.coach_code
            ? ` (${primaryCoach.coach_code})`
            : ""
        }`

      : primaryCoach?.coach_code
  );


  show(
    "substituteCoachName",

    substituteCoach?.full_name

      ? `${substituteCoach.full_name}${
          substituteCoach.coach_code
            ? ` (${substituteCoach.coach_code})`
            : ""
        }`

      : "Chưa có Coach hỗ trợ"
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
    formatDate(
      data.session_date
    )
  );


  show(
    "startTime",
    formatTime(
      data.start_time
    )
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


  await checkPaymentGate();


  updateButtons();

}


/* =====================================================
   CHANGE RESULT
====================================================== */

async function changeStatus(
  nextStatus,
  confirmText
) {

  if (!currentSession) {

    return;

  }


  setMessage(
    "Đang kiểm tra điều kiện học phí..."
  );


  const ready =
    await checkPaymentGate();


  if (!ready) {

    setMessage(
      "Học viên chưa thanh toán đủ học phí hoặc chưa được PickDee xác nhận. Chưa được phép học.",
      true
    );

    return;

  }


  const ok =
    window.confirm(
      confirmText
    );


  if (!ok) {

    return;

  }


  el(
    "completeBtn"
  ).disabled =
    true;


  el(
    "absentBtn"
  ).disabled =
    true;


  setMessage(
    "Đang xử lý..."
  );


  const {
    error
  } =
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

    console.error(
      error
    );


    setMessage(
      "Không xử lý được buổi học: "
      +
      (
        error.message
        ||
        error
      ),
      true
    );


    await checkPaymentGate();


    updateButtons();

    return;

  }


  currentSession.status =
    nextStatus;


  show(
    "status",
    nextStatus
  );


  if (
    nextStatus ===
    "Đã hoàn thành"
  ) {

    setMessage(
      "✓ Đã hoàn thành buổi học, ghi Có mặt và tạo Công Coach."
    );

  }
  else {

    setMessage(
      "✓ Đã ghi học viên Vắng."
    );

  }


  updateButtons();

}


/* =====================================================
   INIT
====================================================== */

async function init() {

  createPaymentGateUI();


  const completeBtn =
    el(
      "completeBtn"
    );

  const absentBtn =
    el(
      "absentBtn"
    );


  completeBtn.disabled =
    true;


  absentBtn.disabled =
    true;


  const ok =
    await checkLogin();


  if (!ok) {

    return;

  }


  await loadSession();


  completeBtn.addEventListener(
    "click",
    function () {

      changeStatus(

        "Đã hoàn thành",

        "Xác nhận học viên đã hoàn thành buổi học này?"

      );

    }
  );


  absentBtn.addEventListener(
    "click",
    function () {

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
