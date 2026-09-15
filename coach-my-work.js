const cfg =
  window.PICKDEE_CONFIG || {};

const sb =
  window.supabase.createClient(
    cfg.SUPABASE_URL,
    cfg.SUPABASE_PUBLISHABLE_KEY
  );


const body =
  document.getElementById(
    "workBody"
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
let works = [];


/* =====================================
   HELPERS
===================================== */

function show(
  id,
  value
) {

  const el =
    document.getElementById(id);

  if (!el) return;

  el.textContent =
    value;
}


function moneyVN(value) {

  return new Intl.NumberFormat(
    "vi-VN",
    {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0
    }
  ).format(
    Number(value || 0)
  );
}


function dateVN(value) {

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
   SẮP XẾP CÔNG COACH
===================================== */

function normalizeStatus(value) {

  return String(
    value || ""
  )
    .trim()
    .toLocaleLowerCase("vi-VN");
}


function workPriority(row) {

  const status =
    normalizeStatus(
      row.status
    );


  if (
    status === "chưa chốt"
  ) {
    return 0;
  }


  if (
    status === "đã chốt"
  ) {
    return 1;
  }


  if (
    status === "đã thanh toán"
  ) {
    return 2;
  }


  return 3;
}


function sortCoachWorks(rows) {

  return [...rows].sort(
    (a, b) => {

      const priorityA =
        workPriority(a);

      const priorityB =
        workPriority(b);


      /*
        1. Chưa chốt
        2. Đã chốt
        3. Đã thanh toán
      */

      if (
        priorityA !== priorityB
      ) {
        return priorityA - priorityB;
      }


      /*
        Trong cùng trạng thái:
        ngày dạy mới nhất trước
      */

      const dateA =
        new Date(
          `${a.work_date || "1970-01-01"}T00:00:00`
        ).getTime();


      const dateB =
        new Date(
          `${b.work_date || "1970-01-01"}T00:00:00`
        ).getTime();


      if (
        dateA !== dateB
      ) {
        return dateB - dateA;
      }


      /*
        Nếu cùng ngày:
        ID mới hơn trước
      */

      return (
        Number(b.id || 0) -
        Number(a.id || 0)
      );
    }
  );
}


/* =====================================
   STYLE TRẠNG THÁI
===================================== */

function statusStyle(status) {

  const value =
    normalizeStatus(status);


  if (
    value === "chưa chốt"
  ) {

    return `
      background:rgba(255,190,70,.14);
      color:#ffd36b;
      border:1px solid rgba(255,190,70,.22);
    `;
  }


  if (
    value === "đã chốt"
  ) {

    return `
      background:rgba(90,180,255,.14);
      color:#9ed5ff;
      border:1px solid rgba(90,180,255,.22);
    `;
  }


  if (
    value === "đã thanh toán"
  ) {

    return `
      background:rgba(216,255,69,.12);
      color:#d8ff45;
      border:1px solid rgba(216,255,69,.20);
    `;
  }


  return "";
}


/* =====================================
   LOGIN
===================================== */

async function checkCoach() {

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
    session.user.email || ""
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
   COACH HIỆN TẠI
===================================== */

async function loadCoach(
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
        email
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


  return true;
}


/* =====================================
   LOAD CÔNG
===================================== */

async function loadWorks() {

  const {
    data,
    error
  } =
    await sb
      .from("coach_work")
      .select(`
        id,
        session_id,
        registration_id,
        coach_id,
        work_date,
        pay_period,
        base_amount,
        bonus,
        deduction,
        total_amount,
        status,
        paid_at,
        class_sessions (
          id,
          session_code
        )
      `)
      .eq(
        "coach_id",
        currentCoach.id
      );


  if (error) {

    console.error(error);

    body.innerHTML = `
      <tr>
        <td colspan="8">
          Không tải được Công Coach.
        </td>
      </tr>
    `;

    messageEl.textContent =
      error.message || String(error);

    return;
  }


  works =
    sortCoachWorks(
      data || []
    );


  renderSummary();


  renderWorks(
    works
  );
}


/* =====================================
   SUMMARY
===================================== */

function renderSummary() {

  const totalSessions =
    works.length;


  const totalAmount =
    works.reduce(
      (sum, row) =>
        sum +
        Number(
          row.total_amount || 0
        ),
      0
    );


  const unpaidAmount =
    works
      .filter(
        row =>
          normalizeStatus(
            row.status
          )
          !==
          "đã thanh toán"
      )
      .reduce(
        (sum, row) =>
          sum +
          Number(
            row.total_amount || 0
          ),
        0
      );


  show(
    "totalSessions",
    totalSessions
  );


  show(
    "totalAmount",
    moneyVN(totalAmount)
  );


  show(
    "unpaidAmount",
    moneyVN(unpaidAmount)
  );
}


/* =====================================
   RENDER TABLE
===================================== */

function renderWorks(
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


  body.innerHTML =
    rows
      .map(
        row => {

          const session =
            one(
              row.class_sessions
            );


          const sessionCode =
            session?.session_code ||
            row.session_id ||
            "—";


          const canOpen =
            Number.isFinite(
              Number(
                row.session_id
              )
            )
            &&
            Number(
              row.session_id
            ) > 0;


          return `
            <tr
              ${
                canOpen
                  ? `
                    style="cursor:pointer"
                    onclick="window.location.href='./coach-session-detail.html?id=${Number(row.session_id)}'"
                    title="Mở chi tiết buổi học ${escapeHTML(sessionCode)}"
                  `
                  : ""
              }
            >

              <td>
                <strong>
                  ${escapeHTML(
                    sessionCode
                  )}
                </strong>
              </td>


              <td>
                ${dateVN(
                  row.work_date
                )}
              </td>


              <td>
                ${escapeHTML(
                  row.pay_period ||
                  "—"
                )}
              </td>


              <td class="money">
                ${moneyVN(
                  row.base_amount
                )}
              </td>


              <td>
                ${moneyVN(
                  row.bonus
                )}
              </td>


              <td>
                ${moneyVN(
                  row.deduction
                )}
              </td>


              <td class="money">
                ${moneyVN(
                  row.total_amount
                )}
              </td>


              <td>

                <span
                  class="badge"
                  style="${statusStyle(
                    row.status
                  )}"
                >

                  ${escapeHTML(
                    row.status ||
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

      renderWorks(
        works
      );

      return;
    }


    const filtered =
      works.filter(
        row => {

          const session =
            one(
              row.class_sessions
            );


          const text = [
            session?.session_code,
            row.session_id,
            row.work_date,
            row.pay_period,
            row.base_amount,
            row.bonus,
            row.deduction,
            row.total_amount,
            row.status
          ]
            .join(" ")
            .toLowerCase();


          return text.includes(
            keyword
          );
        }
      );


    renderWorks(
      filtered
    );
  }
);


/* =====================================
   START
===================================== */

async function init() {

  try {

    const login =
      await checkCoach();


    if (!login) {
      return;
    }


    const coachOK =
      await loadCoach(
        login.user.email
      );


    if (!coachOK) {
      return;
    }


    await loadWorks();

  }
  catch (error) {

    console.error(error);

    messageEl.textContent =
      "Có lỗi khi tải Công Coach: "
      +
      (
        error.message ||
        error
      );

  }
}


init();
/* =====================================
   BỘ LỌC TRẠNG THÁI CÔNG
===================================== */

let activeWorkFilter =
  "all";


(function createWorkFilters() {

  const toolbar =
    document.querySelector(
      ".toolbar"
    );


  if (!toolbar) {
    return;
  }


  const filterBar =
    document.createElement(
      "div"
    );


  filterBar.style.display =
    "flex";

  filterBar.style.gap =
    "8px";

  filterBar.style.flexWrap =
    "wrap";

  filterBar.style.marginTop =
    "10px";


  const filters = [
    {
      key: "all",
      label: "TẤT CẢ"
    },
    {
      key: "chưa chốt",
      label: "CHƯA CHỐT"
    },
    {
      key: "đã chốt",
      label: "ĐÃ CHỐT"
    },
    {
      key: "đã thanh toán",
      label: "ĐÃ THANH TOÁN"
    }
  ];


  filters.forEach(
    item => {

      const btn =
        document.createElement(
          "button"
        );


      btn.type =
        "button";


      btn.dataset.filter =
        item.key;


      btn.textContent =
        item.label;


      btn.style.minHeight =
        "38px";

      btn.style.padding =
        "8px 12px";

      btn.style.borderRadius =
        "9px";

      btn.style.border =
        "1px solid rgba(255,255,255,.15)";

      btn.style.fontSize =
        "11px";

      btn.style.fontWeight =
        "900";

      btn.style.cursor =
        "pointer";


      btn.addEventListener(
        "click",
        function () {

          activeWorkFilter =
            item.key;


          updateFilterButtons();


          applyWorkFilters();

        }
      );


      filterBar.appendChild(
        btn
      );

    }
  );


  toolbar.appendChild(
    filterBar
  );


  function updateFilterButtons() {

    filterBar
      .querySelectorAll(
        "button"
      )
      .forEach(
        btn => {

          const active =
            btn.dataset.filter ===
            activeWorkFilter;


          btn.style.background =
            active
              ? "#d8ff45"
              : "rgba(255,255,255,.06)";


          btn.style.color =
            active
              ? "#172600"
              : "white";


          btn.style.borderColor =
            active
              ? "#d8ff45"
              : "rgba(255,255,255,.15)";

        }
      );

  }


  updateFilterButtons();

})();


function applyWorkFilters() {

  const keyword =
    searchInput.value
      .trim()
      .toLowerCase();


  const filtered =
    works.filter(
      row => {

        /*
          LỌC TRẠNG THÁI
        */

        const statusOK =
          activeWorkFilter ===
          "all"

          ||

          normalizeStatus(
            row.status
          )
          ===
          activeWorkFilter;


        if (!statusOK) {
          return false;
        }


        /*
          LỌC TỪ KHÓA
        */

        if (!keyword) {
          return true;
        }


        const session =
          one(
            row.class_sessions
          );


        const text = [
          session?.session_code,
          row.session_id,
          row.work_date,
          row.pay_period,
          row.base_amount,
          row.bonus,
          row.deduction,
          row.total_amount,
          row.status
        ]
          .join(" ")
          .toLowerCase();


        return text.includes(
          keyword
        );

      }
    );


  renderWorks(
    filtered
  );

}


/*
  Search cũ vẫn giữ nguyên.
  Listener này chạy sau cùng
  để đồng bộ thêm bộ lọc trạng thái.
*/

searchInput.addEventListener(
  "input",
  function () {

    applyWorkFilters();

  }
);
