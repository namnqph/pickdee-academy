const cfg = window.PICKDEE_CONFIG;

const sb = window.supabase.createClient(
  cfg.SUPABASE_URL,
  cfg.SUPABASE_PUBLISHABLE_KEY
);

const body =
  document.getElementById("coachWorkBody");

const searchInput =
  document.getElementById("search");

const userEmail =
  document.getElementById("userEmail");

let allWork = [];


function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function one(value) {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value || null;
}


function formatDate(value) {
  if (!value) return "—";

  return new Intl.DateTimeFormat(
    "vi-VN"
  ).format(
    new Date(`${value}T00:00:00`)
  );
}


function formatMoney(value) {
  const number =
    Number(value || 0);

  return new Intl.NumberFormat(
    "vi-VN",
    {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0
    }
  ).format(number);
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


function renderWork(rows) {
  if (!rows.length) {
    body.innerHTML = `
      <tr>
        <td colspan="9">
          Chưa có Công Coach.
        </td>
      </tr>
    `;

    return;
  }

  body.innerHTML = rows
    .map((item) => {

      const coach =
        one(item.coaches);

      const session =
        one(item.class_sessions);

      const coachName =
        coach?.full_name
          ? `${coach.full_name}${
              coach.coach_code
                ? ` (${coach.coach_code})`
                : ""
            }`
          : coach?.coach_code || "—";

      const sessionCode =
        session?.session_code || "—";

      return `
        <tr>

          <td>
            <strong>
              ${escapeHtml(coachName)}
            </strong>
          </td>

          <td>
            ${escapeHtml(sessionCode)}
          </td>

          <td>
            ${escapeHtml(
              formatDate(item.work_date)
            )}
          </td>

          <td>
            ${escapeHtml(
              item.pay_period || "—"
            )}
          </td>

          <td>
            ${escapeHtml(
              formatMoney(item.base_amount)
            )}
          </td>

          <td>
            ${escapeHtml(
              formatMoney(item.bonus)
            )}
          </td>

          <td>
            ${escapeHtml(
              formatMoney(item.deduction)
            )}
          </td>

          <td>
            <strong>
              ${escapeHtml(
                formatMoney(item.total_amount)
              )}
            </strong>
          </td>

          <td>
            <span class="badge">
              ${escapeHtml(
                item.status || "—"
              )}
            </span>
          </td>

        </tr>
      `;
    })
    .join("");
}


async function loadWork() {
  body.innerHTML = `
    <tr>
      <td colspan="9">
        Đang tải Công Coach...
      </td>
    </tr>
  `;

  const { data, error } = await sb
    .from("coach_work")
    .select(`
      id,
      session_id,
      coach_id,
      registration_id,
      work_date,
      pay_period,
      base_amount,
      bonus,
      deduction,
      total_amount,
      status,
      paid_at,

      coaches (
        id,
        coach_code,
        full_name
      ),

      class_sessions (
        id,
        session_code,
        session_no
      )
    `)
    .order(
      "work_date",
      { ascending: false }
    );

  if (error) {
    console.error(error);

    body.innerHTML = `
      <tr>
        <td colspan="9">
          Không tải được Công Coach:
          ${escapeHtml(
            error.message || error
          )}
        </td>
      </tr>
    `;

    return;
  }

  allWork = data || [];

  renderWork(allWork);
}


searchInput?.addEventListener(
  "input",
  () => {

    const keyword =
      searchInput.value
        .trim()
        .toLowerCase();

    if (!keyword) {
      renderWork(allWork);
      return;
    }

    const filtered =
      allWork.filter((item) => {

        const coach =
          one(item.coaches);

        const session =
          one(item.class_sessions);

        const text = [
          coach?.coach_code,
          coach?.full_name,
          session?.session_code,
          item.pay_period,
          item.status,
          item.base_amount,
          item.total_amount
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return text.includes(keyword);
      });

    renderWork(filtered);
  }
);


async function init() {
  const ok =
    await checkLogin();

  if (!ok) return;

  await loadWork();
}


init();
