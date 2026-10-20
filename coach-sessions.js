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
   SẮP XẾP LỊCH COACH
===================================== */

function normalizeStatus(value) {

  return String(
    value || ""
  )
    .trim()
    .toLocaleLowerCase("vi-VN");
}


function getSessionTime(session) {

  const date =
    session.session_date ||
    "1970-01-01";

  const time =
    session.start_time ||
    "00:00:00";

  const timestamp =
    new Date(
      `${date}T${time}`
    ).getTime();

  return Number.isNaN(timestamp)
    ? 0
    : timestamp;
}


function getSessionPriority(session) {

  const today =
    todayISO();

  const date =
    session.session_date || "";

  const status =
    normalizeStatus(
      session.status
    );


  const isCompleted =
    status === "đã hoàn thành";

  const isAbsent =
    status === "vắng";

  const isCancelled =
    status === "hủy" ||
    status === "đã hủy";

  const isWaiting =
    status === "chờ học";


  /*
    ƯU TIÊN:

    0 = Quá hạn nhưng chưa xử lý
    1 = Hôm nay chưa hoàn thành
    2 = Sắp tới - Chờ học
    3 = Vắng / Hủy / trạng thái khác
    4 = Đã hoàn thành
  */


  if (
    date < today &&
    !isCompleted &&
    !isAbsent &&
    !isCancelled
  ) {
    return 0;
  }


  if (
    date === today &&
    !isCompleted &&
    !isAbsent &&
    !isCancelled
  ) {
    return 1;
  }


  if (
    date > today &&
    isWaiting
  ) {
    return 2;
  }


  if (isCompleted) {
    return 4;
  }


  return 3;
}

function isOverdueSession(session) {

  const today =
    todayISO();

  const date =
    session.session_date || "";

  const status =
    normalizeStatus(
      session.status
    );

  const isCompleted =
    status === "đã hoàn thành";

  const isAbsent =
    status === "vắng";

  const isCancelled =
    status === "hủy" ||
    status === "đã hủy";

  return (
    date < today &&
    !isCompleted &&
    !isAbsent &&
    !isCancelled
  );
}
function sortCoachSessions(rows) {

  return [...rows].sort(
    (a, b) => {

      const priorityA =
        getSessionPriority(a);

      const priorityB =
        getSessionPriority(b);


      // 1. Ưu tiên theo nhóm trạng thái
      if (
        priorityA !== priorityB
      ) {
        return priorityA - priorityB;
      }


      const timeA =
        getSessionTime(a);

      const timeB =
        getSessionTime(b);


      // 2. QUÁ HẠN:
      // buổi cũ nhất cần xử lý trước
      if (
        priorityA === 0
      ) {

        if (timeA !== timeB) {
          return timeA - timeB;
        }

        return (
          Number(a.session_no || 0) -
          Number(b.session_no || 0)
        );
      }


      // 3. HÔM NAY:
      // giờ sớm trước
      if (
        priorityA === 1
      ) {

        if (timeA !== timeB) {
          return timeA - timeB;
        }

        return (
          Number(a.session_no || 0) -
          Number(b.session_no || 0)
        );
      }


      // 4. SẮP TỚI:
      // buổi gần nhất trước
      if (
        priorityA === 2
      ) {

        if (timeA !== timeB) {
          return timeA - timeB;
        }

        return (
          Number(a.session_no || 0) -
          Number(b.session_no || 0)
        );
      }


      // 5. VẮNG / HỦY / TRẠNG THÁI KHÁC:
      // mới nhất trước
      if (
        priorityA === 3
      ) {

        if (timeA !== timeB) {
          return timeB - timeA;
        }

        return (
          Number(b.id || 0) -
          Number(a.id || 0)
        );
      }


      // 6. ĐÃ HOÀN THÀNH:
      // ngày giờ mới nhất trước
      if (timeA !== timeB) {
        return timeB - timeA;
      }


      // Nếu cùng ngày + cùng giờ:
      // buổi số lớn hơn đứng trước
      const sessionNoA =
        Number(a.session_no || 0);

      const sessionNoB =
        Number(b.session_no || 0);


      if (
        sessionNoA !== sessionNoB
      ) {
        return sessionNoB - sessionNoA;
      }


      // Cuối cùng dùng ID mới hơn trước
      return (
        Number(b.id || 0) -
        Number(a.id || 0)
      );
    }
  );
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
   TÌM COACH THEO AUTH USER ID
===================================== */

async function loadCurrentCoach(
  authUserId
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
        "auth_user_id",
        authUserId
      )
      .in(
        "status",
        [
          "Đang hoạt động",
          "Hoạt động"
        ]
      )
      .maybeSingle();


  if (
    error ||
    !data
  ) {

    console.error(error);

    messageEl.textContent =
      "Không tìm thấy Coach đang hoạt động gắn với tài khoản này.";

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
          student_id,
          is_test,
          students (
            id,
            student_code,
            full_name
          )
        )
      `)
      .or(
        `coach_id.eq.${currentCoach.id},substitute_coach_id.eq.${currentCoach.id}`
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

  const cleanRows =
    (data || []).filter(
      item => {

        const registration =
          one(
            item.registrations
          );

        const isReal =
          registration?.is_test !== true;

        const actualCoachId =
          Number(
            item.substitute_coach_id
            ||
            item.coach_id
            ||
            0
          );

        return (
          isReal
          &&
          actualCoachId ===
            Number(
              currentCoach.id
            )
        );
      }
    );

  sessions =
    sortCoachSessions(
      cleanRows
    );

  renderSessions(
    sessions
  );
}


/* =====================================
   NHỜ COACH DẠY THAY
===================================== */

async function requestCoachCover(
  sessionId,
  button
) {

  const session =
    sessions.find(
      item =>
        Number(item.id) ===
        Number(sessionId)
    );


  if (!session) {

    messageEl.textContent =
      "Không xác định được buổi học.";

    return;
  }


  const isPrimaryCoach =
    Number(session.coach_id || 0) ===
    Number(currentCoach?.id || 0);


  const hasSubstituteCoach =
    Number(
      session.substitute_coach_id || 0
    ) > 0;


  const isWaiting =
    normalizeStatus(
      session.status
    ) === "chờ học";


  const startTime =
    getSessionTime(
      session
    );


  if (
    !isPrimaryCoach
    ||
    hasSubstituteCoach
    ||
    !isWaiting
    ||
    !startTime
    ||
    startTime <= Date.now()
  ) {

    messageEl.textContent =
      "Buổi học này hiện không thể tạo yêu cầu Coach dạy thay.";

    return;
  }


  const inputReason =
    window.prompt(
      "Lý do anh/chị cần Coach khác dạy thay buổi này:",
      "Coach chính bận"
    );


  if (inputReason === null) {
    return;
  }


  const reason =
    String(
      inputReason || ""
    ).trim()
    ||
    "Coach chính bận";


  button.disabled =
    true;


  button.textContent =
    "⏳ ĐANG GỬI YÊU CẦU...";


  messageEl.textContent =
    "Đang gửi yêu cầu tìm Coach dạy thay...";


  try {

    const {
      data,
      error
    } =
      await sb.rpc(
        "request_coach_cover",
        {
          p_session_id:
            Number(sessionId),

          p_reason:
            reason
        }
      );


    if (error) {
      throw error;
    }


    button.textContent =
      "✓ ĐÃ NHỜ DẠY THAY";


    messageEl.style.color =
      "#ffc934";


    messageEl.textContent =
      `✓ Đã gửi yêu cầu tìm Coach dạy thay. Mã yêu cầu: ${data}.`;

  }
  catch (error) {

    console.error(
      "REQUEST COACH COVER:",
      error
    );


    button.disabled =
      false;


    button.textContent =
      "🔄 NHỜ COACH DẠY THAY";


    messageEl.style.color =
      "#ffb0b0";


    messageEl.textContent =
      "Không tạo được yêu cầu dạy thay: "
      +
      (
        error?.message
        ||
        error
      );

  }

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


          const isOverdue =
            isOverdueSession(
              session
            );


          const isTestSession =
            registration?.is_test ===
            true;


          const isPrimaryCoach =
            Number(
              session.coach_id || 0
            )
            ===
            Number(
              currentCoach?.id || 0
            );


          const hasSubstituteCoach =
            Number(
              session.substitute_coach_id || 0
            ) > 0;


          const isWaiting =
            normalizeStatus(
              session.status
            ) ===
            "chờ học";


          const sessionTime =
            getSessionTime(
              session
            );


          const canRequestCover =
            !isTestSession
            &&
            isPrimaryCoach
            &&
            !hasSubstituteCoach
            &&
            isWaiting
            &&
            sessionTime > Date.now();


          return `
            <tr
              style="
                cursor:pointer;
                ${
                  isOverdue
                    ? "background:rgba(255,80,80,.10);"
                    : ""
                }
              "
              onclick="window.location.href='./coach-session-detail.html?id=${session.id}'"
              title="${
                isOverdue
                  ? "⚠ Buổi học đã quá hạn nhưng chưa được xử lý"
                  : "Mở chi tiết buổi học"
              }"
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

                <span
                  class="badge"
                  style="${
                    isOverdue
                      ? `
                          background:rgba(255,80,80,.16);
                          color:#ff9b9b;
                          border:1px solid rgba(255,80,80,.35);
                        `
                      : ""
                  }"
                >

                  ${
                    isOverdue
                      ? "⚠ QUÁ HẠN · "
                      : ""
                  }

                  ${escapeHTML(
                    session.status ||
                    "—"
                  )}

                </span>


                ${
                  canRequestCover
                    ? `
                      <button
                        type="button"
                        class="coach-cover-request-btn"
                        data-session-id="${Number(session.id)}"
                        style="
                          display:block;
                          margin-top:8px;
                          padding:7px 9px;
                          border:1px solid rgba(255,201,52,.35);
                          border-radius:8px;
                          background:rgba(255,255,255,.07);
                          color:#ffc934;
                          font-size:11px;
                          font-weight:900;
                          cursor:pointer;
                          white-space:nowrap;
                        "
                      >
                        🔄 NHỜ COACH DẠY THAY
                      </button>
                    `
                    : ""
                }

              </td>

            </tr>
          `;
        }
      )
      .join("");


  const coverButtons =
    body.querySelectorAll(
      ".coach-cover-request-btn"
    );


  coverButtons.forEach(
    button => {

      button.addEventListener(
        "click",
        async event => {

          event.preventDefault();

          event.stopPropagation();


          const sessionId =
            Number(
              button.dataset.sessionId
            );


          await requestCoachCover(
            sessionId,
            button
          );

        }
      );

    }
  );

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
    session.user.id
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
