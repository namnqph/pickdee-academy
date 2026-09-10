const cfg =
  window.PICKDEE_CONFIG || {};

const sb =
  window.supabase.createClient(
    cfg.SUPABASE_URL,
    cfg.SUPABASE_PUBLISHABLE_KEY
  );


const messageEl =
  document.getElementById("message");

const registrationList =
  document.getElementById("registrationList");

const paymentBody =
  document.getElementById("paymentBody");

const logoutBtn =
  document.getElementById("logoutBtn");


let currentStudent = null;
let registrations = [];
let payments = [];


/* =====================================
   HELPERS
===================================== */

function moneyVN(value) {

  return (
    Number(value || 0)
      .toLocaleString("vi-VN") +
    "đ"
  );
}


function escapeHTML(value) {

  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function dateVN(value) {

  if (!value) {
    return "—";
  }

  const text =
    String(value);

  if (
    /^\d{4}-\d{2}-\d{2}$/.test(text)
  ) {

    const [
      year,
      month,
      day
    ] =
      text.split("-");

    return `${day}/${month}/${year}`;
  }


  return new Intl.DateTimeFormat(
    "vi-VN"
  ).format(
    new Date(value)
  );
}


/* =====================================
   AUTH
===================================== */

async function checkStudent() {

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


  document.getElementById(
    "userEmail"
  ).textContent =
    session.user.email || "";


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
    profile.role !== "student"
  ) {

    location.replace(
      "./login.html"
    );

    return null;
  }


  return session;
}


/* =====================================
   STUDENT
===================================== */

async function loadStudent() {

  const {
    data: studentId,
    error: idError
  } =
    await sb.rpc(
      "current_student_id"
    );


  if (
    idError ||
    !studentId
  ) {

    throw new Error(
      "Không xác định được hồ sơ học viên."
    );
  }


  currentStudent = {
    id: Number(studentId)
  };
}


/* =====================================
   REGISTRATIONS
===================================== */

async function loadRegistrations() {

  const {
    data,
    error
  } =
    await sb
      .from("registrations")
      .select(`
        id,
        registration_code,
        package_name,
        tuition_fee,
        start_date,
        end_date,
        status,
        created_at
      `)
      .eq(
        "student_id",
        currentStudent.id
      )
      .order(
        "created_at",
        { ascending: false }
      );


  if (error) {
    throw error;
  }


  registrations =
    data || [];
}


/* =====================================
   PAYMENTS
===================================== */

async function loadPayments() {

  const {
    data,
    error
  } =
    await sb
      .from("tuition_payments")
      .select(`
        id,
        payment_code,
        registration_id,
        student_id,
        amount,
        payment_date,
        payment_method,
        status,
        note,
        created_at
      `)
      .eq(
        "student_id",
        currentStudent.id
      )
      .order(
        "payment_date",
        { ascending: false }
      )
      .order(
        "id",
        { ascending: false }
      );


  if (error) {
    throw error;
  }


  payments =
    data || [];
}


/* =====================================
   TÍNH TIỀN ĐÃ THU CỦA 1 ĐĂNG KÝ
===================================== */

function paidForRegistration(
  registrationId
) {

  return payments
    .filter(
      payment =>
        Number(
          payment.registration_id
        ) ===
        Number(registrationId)
        &&
        payment.status === "Đã thu"
    )
    .reduce(
      (sum, payment) =>
        sum +
        Number(payment.amount || 0),
      0
    );
}


/* =====================================
   SUMMARY
===================================== */

function renderSummary() {

  const totalTuition =
    registrations.reduce(
      (sum, row) =>
        sum +
        Number(row.tuition_fee || 0),
      0
    );


  const totalPaid =
    payments
      .filter(
        row =>
          row.status === "Đã thu"
      )
      .reduce(
        (sum, row) =>
          sum +
          Number(row.amount || 0),
        0
      );


  const totalDebt =
    Math.max(
      totalTuition -
      totalPaid,
      0
    );


  document.getElementById(
    "totalTuition"
  ).textContent =
    moneyVN(totalTuition);


  document.getElementById(
    "totalPaid"
  ).textContent =
    moneyVN(totalPaid);


  document.getElementById(
    "totalDebt"
  ).textContent =
    moneyVN(totalDebt);
}


/* =====================================
   REGISTRATION CARDS
===================================== */

function renderRegistrations() {

  if (
    registrations.length === 0
  ) {

    registrationList.innerHTML =
      `
        <div class="empty">
          Bạn chưa có gói học nào.
        </div>
      `;

    return;
  }


  registrationList.innerHTML =
    registrations
      .map(row => {

        const tuition =
          Number(
            row.tuition_fee || 0
          );


        const paid =
          paidForRegistration(
            row.id
          );


        const debt =
          Math.max(
            tuition - paid,
            0
          );


        let paymentStatus =
          "Chưa thanh toán";


        if (
          tuition > 0 &&
          paid >= tuition
        ) {

          paymentStatus =
            "Đã thanh toán đủ";

        }

        else if (paid > 0) {

          paymentStatus =
            "Đã thanh toán một phần";
        }


        return `

          <section class="registration-card">

            <div class="registration-head">

              <div>

                <div class="registration-code">
                  ${escapeHTML(
                    row.registration_code ||
                    "—"
                  )}
                </div>

                <div class="package-name">
                  ${escapeHTML(
                    row.package_name ||
                    "—"
                  )}
                </div>

              </div>


              <span class="badge">
                ${escapeHTML(
                  paymentStatus
                )}
              </span>

            </div>


            <div class="money-grid">

              <div>

                <div class="label">
                  Học phí
                </div>

                <div class="value">
                  ${moneyVN(
                    tuition
                  )}
                </div>

              </div>


              <div>

                <div class="label">
                  Đã đóng
                </div>

                <div class="value paid">
                  ${moneyVN(
                    paid
                  )}
                </div>

              </div>


              <div>

                <div class="label">
                  Còn nợ
                </div>

                <div class="value debt">
                  ${moneyVN(
                    debt
                  )}
                </div>

              </div>

            </div>

          </section>

        `;

      })
      .join("");
}


/* =====================================
   PAYMENT HISTORY
===================================== */

function renderPayments() {

  if (
    payments.length === 0
  ) {

    paymentBody.innerHTML =
      `
        <tr>
          <td
            colspan="6"
            class="empty"
          >
            Chưa có lần thanh toán nào.
          </td>
        </tr>
      `;

    return;
  }


  paymentBody.innerHTML =
    payments
      .map(payment => {

        const registration =
          registrations.find(
            row =>
              Number(row.id) ===
              Number(
                payment.registration_id
              )
          );


        return `

          <tr>

            <td>
              ${escapeHTML(
                payment.payment_code ||
                "—"
              )}
            </td>

            <td>
              ${dateVN(
                payment.payment_date
              )}
            </td>

            <td>
              ${escapeHTML(
                registration?.package_name ||
                "—"
              )}
            </td>

            <td>
              <strong>
                ${moneyVN(
                  payment.amount
                )}
              </strong>
            </td>

            <td>
              ${escapeHTML(
                payment.payment_method ||
                "—"
              )}
            </td>

            <td>
              <span class="badge">
                ${escapeHTML(
                  payment.status ||
                  "—"
                )}
              </span>
            </td>

          </tr>

        `;

      })
      .join("");
}


/* =====================================
   RENDER ALL
===================================== */

function render() {

  renderSummary();

  renderRegistrations();

  renderPayments();
}


/* =====================================
   LOGOUT
===================================== */

logoutBtn.addEventListener(
  "click",
  async () => {

    logoutBtn.disabled =
      true;


    await sb.auth.signOut();


    location.replace(
      "./login.html"
    );
  }
);


/* =====================================
   START
===================================== */

async function init() {

  try {

    const session =
      await checkStudent();


    if (!session) {
      return;
    }


    await loadStudent();

    await loadRegistrations();

    await loadPayments();


    render();

  }

  catch (error) {

    console.error(error);


    messageEl.textContent =
      "Không tải được học phí: " +
      (
        error.message ||
        error
      );
  }
}


init();
