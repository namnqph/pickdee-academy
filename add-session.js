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

const requestedRegistrationId =
  Number(
    params.get("registration_id") || 0
  );


const form =
  document.getElementById("sessionForm");

const registrationSelect =
  document.getElementById("registrationId");

const studentNameInput =
  document.getElementById("studentName");

const coachNameInput =
  document.getElementById("coachName");

const sessionNoInput =
  document.getElementById("sessionNo");

const sessionDateInput =
  document.getElementById("sessionDate");

const startTimeInput =
  document.getElementById("startTime");

const durationInput =
  document.getElementById("durationMinutes");

const courtInput =
  document.getElementById("courtName");

const noteInput =
  document.getElementById("note");

const submitBtn =
  document.getElementById("submitBtn");

const messageEl =
  document.getElementById("message");

const backLink =
  document.getElementById("backLink");


let registrations = [];


/* ======================================
   HELPER
====================================== */

function one(value) {

  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value || null;
}


function showMessage(
  text,
  isError = false
) {

  if (!messageEl) return;

  messageEl.textContent = text;

  messageEl.style.marginTop =
    "12px";

  messageEl.style.color =
    isError
      ? "#ff8a8a"
      : "#b7ff00";
}


/* ======================================
   KIỂM TRA ADMIN
====================================== */

async function checkAdmin() {

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


  const userEmail =
    document.getElementById(
      "userEmail"
    );

  if (userEmail) {
    userEmail.textContent =
      session.user.email || "";
  }


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
    profile.role !== "admin"
  ) {

    location.replace(
      "./login.html"
    );

    return false;
  }


  return true;
}


/* ======================================
   TẢI ĐĂNG KÝ ĐÃ DUYỆT
====================================== */

async function loadRegistrations() {

  registrationSelect.innerHTML = `
    <option value="">
      Đang tải đăng ký...
    </option>
  `;


  const {
    data,
    error
  } =
    await sb
      .from("registrations")
      .select(`
        id,
        registration_code,
        student_id,
        coach_id,
        package_name,
        start_date,
        status,
        students (
          id,
          student_code,
          full_name
        ),
        coaches (
          id,
          coach_code,
          full_name
        )
      `)
      .eq(
        "status",
        "Đã duyệt"
      )
      .not(
        "coach_id",
        "is",
        null
      )
      .order(
        "created_at",
        { ascending: false }
      );


  if (error) {

    console.error(error);

    registrationSelect.innerHTML = `
      <option value="">
        Không tải được đăng ký
      </option>
    `;

    showMessage(
      "Không tải được danh sách đăng ký: " +
        (error.message || error),
      true
    );

    return;
  }


  registrations =
    data || [];


  registrationSelect.innerHTML = `
    <option value="">
      — Chọn đăng ký —
    </option>
  `;


  registrations.forEach(
    registration => {

      const student =
        one(registration.students);

      const coach =
        one(registration.coaches);

      const option =
        document.createElement(
          "option"
        );

      option.value =
        String(registration.id);

      option.textContent = [
        registration.registration_code ||
          "—",

        student?.full_name ||
          student?.student_code ||
          "—",

        registration.package_name ||
          "—",

        coach?.full_name ||
          coach?.coach_code ||
          "—"
      ].join(" | ");


      registrationSelect
        .appendChild(option);
    }
  );


  if (
    registrations.length === 0
  ) {

    showMessage(
      "Chưa có đăng ký Đã duyệt và đã gán Coach.",
      true
    );

    return;
  }


  /*
    Nếu đi từ Chi tiết đăng ký
    → tự chọn đúng đăng ký đó
  */

  if (requestedRegistrationId) {

    const registration =
      registrations.find(
        item =>
          Number(item.id) ===
          requestedRegistrationId
      );


    if (registration) {

      registrationSelect.value =
        String(
          requestedRegistrationId
        );

      await applyRegistration(
        registration
      );

    } else {

      showMessage(
        "Đăng ký này chưa đủ điều kiện tạo buổi học.",
        true
      );
    }
  }
}


/* ======================================
   BUỔI SỐ TIẾP THEO
====================================== */

async function getNextSessionNo(
  registrationId
) {

  const {
    data,
    error
  } =
    await sb
      .from("class_sessions")
      .select("session_no")
      .eq(
        "registration_id",
        registrationId
      )
      .order(
        "session_no",
        { ascending: false }
      )
      .limit(1);


  if (error) {
    throw error;
  }


  if (
    !data ||
    data.length === 0
  ) {

    return 1;
  }


  return (
    Number(
      data[0].session_no || 0
    ) + 1
  );
}


/* ======================================
   MÃ BUỔI HỌC TIẾP THEO
====================================== */

async function getNextSessionCode() {

  const {
    data,
    error
  } =
    await sb
      .from("class_sessions")
      .select("session_code");


  if (error) {
    throw error;
  }


  let maxNumber = 0;


  (data || []).forEach(
    row => {

      const match =
        String(
          row.session_code || ""
        )
          .toUpperCase()
          .match(/^BH(\d+)$/);


      if (!match) return;


      const number =
        Number(match[1]);


      if (
        number > maxNumber
      ) {

        maxNumber =
          number;
      }
    }
  );


  const nextNumber =
    maxNumber + 1;


  return (
    `BH${String(nextNumber)
      .padStart(3, "0")}`
  );
}


/* ======================================
   ÁP DỤNG ĐĂNG KÝ VÀO FORM
====================================== */

async function applyRegistration(
  registration
) {

  const student =
    one(registration.students);

  const coach =
    one(registration.coaches);


  studentNameInput.value =
    student?.full_name ||
    student?.student_code ||
    "—";


  coachNameInput.value =
    coach?.full_name
      ? `${coach.full_name}${
          coach.coach_code
            ? ` (${coach.coach_code})`
            : ""
        }`
      : coach?.coach_code ||
        "—";


  /*
    Link quay lại đúng đăng ký
  */

  if (backLink) {

    backLink.href =
      `./registration-detail.html?id=${registration.id}`;
  }


  /*
    Tự lấy ngày bắt đầu
    từ đăng ký làm ngày học ban đầu
  */

  if (
    registration.start_date
  ) {

    sessionDateInput.value =
      registration.start_date;
  }


  try {

    const nextSessionNo =
      await getNextSessionNo(
        registration.id
      );

    sessionNoInput.value =
      nextSessionNo;

  } catch (error) {

    console.error(error);

    showMessage(
      "Không tính được số buổi tiếp theo: " +
        (error.message || error),
      true
    );
  }
}


/* ======================================
   KHI CHỌN ĐĂNG KÝ
====================================== */

registrationSelect.addEventListener(
  "change",
  async () => {

    studentNameInput.value = "";
    coachNameInput.value = "";
    sessionNoInput.value = "";


    const registrationId =
      Number(
        registrationSelect.value
      );


    if (!registrationId) {
      return;
    }


    const registration =
      registrations.find(
        item =>
          Number(item.id) ===
          registrationId
      );


    if (!registration) {
      return;
    }


    await applyRegistration(
      registration
    );
  }
);


/* ======================================
   TẠO BUỔI HỌC
====================================== */

form.addEventListener(
  "submit",
  async event => {

    event.preventDefault();

    showMessage("");


    const registrationId =
      Number(
        registrationSelect.value
      );


    if (!registrationId) {

      showMessage(
        "Hãy chọn đăng ký học.",
        true
      );

      return;
    }


    const registration =
      registrations.find(
        item =>
          Number(item.id) ===
          registrationId
      );


    if (!registration) {

      showMessage(
        "Không tìm thấy đăng ký đã chọn.",
        true
      );

      return;
    }


    if (!registration.coach_id) {

      showMessage(
        "Đăng ký này chưa được gán Coach.",
        true
      );

      return;
    }


    if (!sessionDateInput.value) {

      showMessage(
        "Hãy chọn ngày học.",
        true
      );

      return;
    }


    if (!startTimeInput.value) {

      showMessage(
        "Hãy chọn giờ bắt đầu.",
        true
      );

      return;
    }


    submitBtn.disabled =
      true;

    submitBtn.textContent =
      "ĐANG TẠO...";


    try {

      const sessionNo =
        await getNextSessionNo(
          registrationId
        );


      const sessionCode =
        await getNextSessionCode();


      const {
        data,
        error
      } =
        await sb
          .from("class_sessions")
          .insert({

            session_code:
              sessionCode,

            registration_id:
              registrationId,

            coach_id:
              registration.coach_id,

            session_no:
              sessionNo,

            session_date:
              sessionDateInput.value,

            start_time:
              startTimeInput.value,

            duration_minutes:
              Number(
                durationInput.value ||
                60
              ),

            court_name:
              courtInput.value
                .trim() ||
              null,

            status:
              "Chờ học",

            note:
              noteInput.value
                .trim() ||
              null

          })
          .select()
          .single();


      if (error) {
        throw error;
      }


      showMessage(
        `Đã tạo ${data.session_code} thành công.`
      );


      setTimeout(
        () => {

          location.href =
            "./sessions.html";

        },
        800
      );


    } catch (error) {

      console.error(error);


      showMessage(
        "Không tạo được buổi học: " +
          (error.message || error),
        true
      );


      submitBtn.disabled =
        false;


      submitBtn.textContent =
        "+ TẠO BUỔI HỌC";
    }
  }
);


/* ======================================
   START
====================================== */

async function init() {

  const ok =
    await checkAdmin();


  if (!ok) {
    return;
  }


  /*
    Nếu mở trực tiếp
    không có registration_id
    thì nút quay lại danh sách lịch
  */

  if (
    backLink &&
    !requestedRegistrationId
  ) {

    backLink.href =
      "./sessions.html";
  }


  await loadRegistrations();
}


init();
