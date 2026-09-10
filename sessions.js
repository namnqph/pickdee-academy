const cfg =
  window.PICKDEE_CONFIG;


const sb =
  supabase.createClient(
    cfg.SUPABASE_URL,
    cfg.SUPABASE_PUBLISHABLE_KEY
  );


const body =
  document.getElementById(
    "sessionsBody"
  );


const searchInput =
  document.getElementById(
    "search"
  );


const userEmail =
  document.getElementById(
    "userEmail"
  );


let allSessions = [];


/* =====================================
   HELPERS
===================================== */

function escapeHtml(value) {

  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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


  return String(value)
    .slice(0, 5);
}


/* =====================================
   ƯU TIÊN TRẠNG THÁI
===================================== */

function getStatusPriority(status) {

  const value =
    String(status || "")
      .trim()
      .toLowerCase();


  /*
    ƯU TIÊN CAO NHẤT
    Các buổi đang chờ học
  */

  if (
    value === "chờ học"
  ) {

    return 1;
  }


  /*
    CÁC TRẠNG THÁI TRUNG GIAN

    Ví dụ sau này:
    Chờ duyệt
    Đã duyệt
    Đang học
    Vắng
    ...
  */

  if (
    value !== "đã hoàn thành"
  ) {

    return 2;
  }


  /*
    ĐÃ HOÀN THÀNH
    LUÔN XUỐNG CUỐI
  */

  return 3;
}


/* =====================================
   SORT LỊCH HỌC
===================================== */

function sortSessions(rows) {

  return [...rows]
    .sort(
      (a, b) => {


        /* ===========================
           1. TRẠNG THÁI
        =========================== */

        const statusDifference =
          getStatusPriority(
            a.status
          )
          -
          getStatusPriority(
            b.status
          );


        if (
          statusDifference !== 0
        ) {

          return statusDifference;
        }


        /* ===========================
           2. NGÀY HỌC
        =========================== */

        const dateA =
          a.session_date || "9999-12-31";


        const dateB =
          b.session_date || "9999-12-31";


        const dateCompare =
          String(dateA)
            .localeCompare(
              String(dateB)
            );


        if (
          dateCompare !== 0
        ) {

          return dateCompare;
        }


        /* ===========================
           3. GIỜ HỌC
        =========================== */

        const timeA =
          a.start_time || "23:59:59";


        const timeB =
          b.start_time || "23:59:59";


        const timeCompare =
          String(timeA)
            .localeCompare(
              String(timeB)
            );


        if (
          timeCompare !== 0
        ) {

          return timeCompare;
        }


        /* ===========================
           4. BUỔI SỐ
        =========================== */

        const sessionNoDifference =
          Number(
            a.session_no || 0
          )
          -
          Number(
            b.session_no || 0
          );


        if (
          sessionNoDifference !== 0
        ) {

          return sessionNoDifference;
        }


        /* ===========================
           5. ID
        =========================== */

        return (
          Number(a.id || 0)
          -
          Number(b.id || 0)
        );

      }
    );
}


/* =====================================
   LOGIN
===================================== */

async function checkLogin() {

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


  if (userEmail) {

    userEmail.textContent =
      session.user.email || "";
  }


  return true;
}


/* =====================================
   RENDER
===================================== */

function renderSessions(rows) {

  /*
    Luôn sort lại trước khi render.
    Vì vậy cả danh sách chính
    và kết quả tìm kiếm đều đúng thứ tự.
  */

  const sortedRows =
    sortSessions(rows);


  if (
    !sortedRows.length
  ) {

    body.innerHTML = `
      <tr>
        <td colspan="8">
          Chưa có lịch học.
        </td>
      </tr>
    `;

    return;
  }


  body.innerHTML =
    sortedRows
      .map(
        item => {


          const registration =
            item.registrations || {};


          const student =
            registration.students || {};


          const coach =
            item.coaches || {};


          const studentName =
            student.full_name ||
            student.student_code ||
            "—";


          const coachName =
            coach.full_name
              ?
              `${coach.full_name}${
                coach.coach_code
                  ?
                  ` (${coach.coach_code})`
                  :
                  ""
              }`
              :
              coach.coach_code ||
              "—";


          return `

            <tr>


              <!-- MÃ BUỔI -->

              <td>

                <a
                  href="./session-detail.html?id=${encodeURIComponent(
                    item.id
                  )}"
                  style="
                    color: inherit;
                    text-decoration: none;
                    font-weight: 800;
                  "
                >
                  ${escapeHtml(
                    item.session_code ||
                    "—"
                  )}
                </a>

              </td>


              <!-- HỌC VIÊN -->

              <td>
                ${escapeHtml(
                  studentName
                )}
              </td>


              <!-- COACH -->

              <td>
                ${escapeHtml(
                  coachName
                )}
              </td>


              <!-- BUỔI SỐ -->

              <td>
                ${escapeHtml(
                  item.session_no
                )}
              </td>


              <!-- NGÀY -->

              <td>
                ${escapeHtml(
                  formatDate(
                    item.session_date
                  )
                )}
              </td>


              <!-- GIỜ -->

              <td>
                ${escapeHtml(
                  formatTime(
                    item.start_time
                  )
                )}
              </td>


              <!-- SÂN -->

              <td>
                ${escapeHtml(
                  item.court_name ||
                  "—"
                )}
              </td>


              <!-- TRẠNG THÁI -->

              <td>

                <span class="badge">

                  ${escapeHtml(
                    item.status ||
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
   LOAD SESSIONS
===================================== */

async function loadSessions() {

  body.innerHTML = `
    <tr>
      <td colspan="8">
        Đang tải lịch học...
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
        court_id,
        court_cost,
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
      `);


  if (error) {

    console.error(
      error
    );


    body.innerHTML = `
      <tr>
        <td colspan="8">
          Không tải được lịch học:
          ${escapeHtml(
            error.message ||
            error
          )}
        </td>
      </tr>
    `;


    return;
  }


  /*
    Sắp xếp ngay khi nhận dữ liệu:

    1. Chờ học
    2. Trạng thái khác
    3. Đã hoàn thành

    Trong từng nhóm:
    ngày → giờ → buổi số
  */

  allSessions =
    sortSessions(
      data || []
    );


  renderSessions(
    allSessions
  );
}


/* =====================================
   SEARCH
===================================== */

searchInput?.addEventListener(
  "input",
  function () {


    const keyword =
      searchInput.value
        .trim()
        .toLowerCase();


    if (!keyword) {

      renderSessions(
        allSessions
      );

      return;
    }


    const filtered =
      allSessions.filter(
        item => {


          const registration =
            item.registrations || {};


          const student =
            registration.students || {};


          const coach =
            item.coaches || {};


          const text =
            [
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

  const ok =
    await checkLogin();


  if (!ok) {
    return;
  }


  await loadSessions();
}


init();
