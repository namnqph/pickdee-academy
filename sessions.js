const cfg =
  window.PICKDEE_CONFIG || {};


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


/* =====================================================
   HELPERS
===================================================== */

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


function normalizeStatus(value) {

  return String(
    value || ""
  )
    .trim()
    .toLowerCase();

}


/* =====================================================
   THỜI GIAN BUỔI HỌC
===================================================== */

function getSessionStart(item) {

  if (!item.session_date) {
    return null;
  }


  const time =
    item.start_time
    ||
    "00:00:00";


  const date =
    new Date(
      `${item.session_date}T${time}`
    );


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return null;

  }


  return date;

}


function getSessionEnd(item) {

  const start =
    getSessionStart(
      item
    );


  if (!start) {
    return null;
  }


  const duration =
    Number(
      item.duration_minutes || 60
    );


  return new Date(
    start.getTime()
    +
    duration * 60 * 1000
  );

}


/* =====================================================
   KIỂM TRA CÓ PHẢI HÔM NAY
===================================================== */

function isTodayDate(
  value
) {

  if (!value) {
    return false;
  }


  const date =
    new Date(
      `${value}T00:00:00`
    );


  const today =
    new Date();


  return (

    date.getFullYear()
      ===
    today.getFullYear()

    &&

    date.getMonth()
      ===
    today.getMonth()

    &&

    date.getDate()
      ===
    today.getDate()

  );

}


/* =====================================================
   TRẠNG THÁI VẬN HÀNH

   overdue   = quá hạn nhưng vẫn Chờ học
   today     = buổi hôm nay
   pending   = buổi tương lai
   completed = đã hoàn thành
   other     = trạng thái khác
===================================================== */

function getOperationalState(
  item
) {

  const status =
    normalizeStatus(
      item.status
    );


  /* =========================
     ĐÃ HOÀN THÀNH
  ========================= */

  if (
    status ===
    "đã hoàn thành"
  ) {

    return "completed";

  }


  /* =========================
     CHỜ HỌC
  ========================= */

  if (
    status ===
    "chờ học"
  ) {


    const end =
      getSessionEnd(
        item
      );


    const now =
      new Date();


    /*
      Chỉ coi là QUÁ HẠN
      khi đã qua hết thời lượng buổi.

      Ví dụ:
      học 09:00 - 10:00
      thì 09:30 chưa bị báo quá hạn.
    */

    if (
      end
      &&
      end.getTime()
        <
      now.getTime()
    ) {

      return "overdue";

    }


    if (
      isTodayDate(
        item.session_date
      )
    ) {

      return "today";

    }


    return "pending";

  }


  return "other";

}


/* =====================================================
   ƯU TIÊN SẮP XẾP

   1. QUÁ HẠN
   2. HÔM NAY
   3. CHỜ HỌC TƯƠNG LAI
   4. TRẠNG THÁI KHÁC
   5. ĐÃ HOÀN THÀNH
===================================================== */

function getPriority(
  item
) {

  const state =
    getOperationalState(
      item
    );


  if (
    state === "overdue"
  ) {

    return 1;

  }


  if (
    state === "today"
  ) {

    return 2;

  }


  if (
    state === "pending"
  ) {

    return 3;

  }


  if (
    state === "other"
  ) {

    return 4;

  }


  return 5;

}


/* =====================================================
   SORT
===================================================== */

function sortSessions(
  rows
) {

  return [...rows]
    .sort(
      (a, b) => {


        const priorityA =
          getPriority(a);


        const priorityB =
          getPriority(b);


        if (
          priorityA !==
          priorityB
        ) {

          return (
            priorityA
            -
            priorityB
          );

        }


        const startA =
          getSessionStart(a);


        const startB =
          getSessionStart(b);


        const timeA =
          startA
            ?
            startA.getTime()
            :
            0;


        const timeB =
          startB
            ?
            startB.getTime()
            :
            0;


        /*
          Đã hoàn thành:
          buổi mới nhất nằm trên.

          Các nhóm còn lại:
          buổi gần nhất nằm trên.
        */

        if (
          getOperationalState(a)
          ===
          "completed"
        ) {

          if (
            timeA !== timeB
          ) {

            return (
              timeB
              -
              timeA
            );

          }

        }
        else {


          if (
            timeA !== timeB
          ) {

            return (
              timeA
              -
              timeB
            );

          }

        }


        return (
          Number(a.id || 0)
          -
          Number(b.id || 0)
        );

      }
    );

}


/* =====================================================
   HIỂN THỊ TRẠNG THÁI
===================================================== */

function getStatusView(
  item
) {

  const state =
    getOperationalState(
      item
    );


  /* =========================
     QUÁ HẠN
  ========================= */

  if (
    state ===
    "overdue"
  ) {

    return {

      label:
        "⚠ QUÁ HẠN",

      rowStyle:
        "background:rgba(255,80,80,.08);",

      badgeStyle:
        `
          background:rgba(255,80,80,.18);
          color:#ffaaaa;
          border:1px solid rgba(255,100,100,.35);
        `

    };

  }


  /* =========================
     HÔM NAY
  ========================= */

  if (
    state ===
    "today"
  ) {

    return {

      label:
        "📍 HÔM NAY · CHỜ HỌC",

      rowStyle:
        "background:rgba(255,193,24,.055);",

      badgeStyle:
        `
          background:rgba(255,193,24,.15);
          color:#ffc934;
          border:1px solid rgba(255,193,24,.28);
        `

    };

  }


  /* =========================
     CHỜ HỌC
  ========================= */

  if (
    state ===
    "pending"
  ) {

    return {

      label:
        "CHỜ HỌC",

      rowStyle:
        "",

      badgeStyle:
        `
          background:rgba(255,193,24,.11);
          color:#ffc934;
        `

    };

  }


  /* =========================
     ĐÃ HOÀN THÀNH
  ========================= */

  if (
    state ===
    "completed"
  ) {

    return {

      label:
        "ĐÃ HOÀN THÀNH",

      rowStyle:
        "opacity:.66;",

      badgeStyle:
        `
          background:rgba(255,255,255,.08);
          color:#bababa;
        `

    };

  }


  /* =========================
     KHÁC
  ========================= */

  return {

    label:
      item.status || "—",

    rowStyle:
      "",

    badgeStyle:
      ""

  };

}


/* =====================================================
   LOGIN
===================================================== */

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


/* =====================================================
   RENDER
===================================================== */

function renderSessions(
  rows
) {

  const sortedRows =
    sortSessions(
      rows
    );


  if (
    !sortedRows.length
  ) {

    body.innerHTML =
      `
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


          const statusView =
            getStatusView(
              item
            );


          const studentName =
            student.full_name
            ||
            student.student_code
            ||
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
              coach.coach_code
              ||
              "—";


          return `

            <tr
              style="${statusView.rowStyle}"
            >


              <!-- MÃ BUỔI -->

              <td>

                <a
                  href="./session-detail.html?id=${encodeURIComponent(
                    item.id
                  )}"
                  style="
                    color:inherit;
                    text-decoration:none;
                    font-weight:800;
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

                <span
                  class="badge"
                  style="${statusView.badgeStyle}"
                >

                  ${escapeHtml(
                    statusView.label
                  )}

                </span>

              </td>


            </tr>

          `;

        }
      )
      .join("");

}


/* =====================================================
   LOAD SESSIONS
===================================================== */

async function loadSessions() {

  body.innerHTML =
    `
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
      .from(
        "class_sessions"
      )
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

          is_test,


          students (

            id,

            student_code,

            full_name

          )

        ),


       coaches:coaches!class_sessions_coach_id_fkey (

  id,

  coach_code,

  full_name

)
      `);


  if (error) {

    console.error(
      error
    );


    body.innerHTML =
      `
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
    ==========================================
    CHỈ GIỮ DỮ LIỆU REAL
    ==========================================
  */

  const realSessions =
    (
      Array.isArray(data)
        ? data
        : []
    )
      .filter(
        item => {

          const registration =
            item.registrations || {};


          /*
            Registration được đánh dấu TEST
            → không hiển thị trên trang vận hành.
          */

          if (
            registration.is_test === true
          ) {

            return false;

          }


          return true;

        }
      );


  allSessions =
    sortSessions(
      realSessions
    );


  renderSessions(
    allSessions
  );

}


/* =====================================================
   SEARCH
===================================================== */

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


          const operational =
            getStatusView(
              item
            ).label;


          const text =
            [

              item.session_code,

              item.session_no,

              item.session_date,

              item.start_time,

              item.court_name,

              item.status,

              operational,

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


/* =====================================================
   START
===================================================== */

async function init() {


  const ok =
    await checkLogin();


  if (!ok) {

    return;

  }


  await loadSessions();

}


init();
