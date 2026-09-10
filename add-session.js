const cfg =
  window.PICKDEE_CONFIG || {};


const sb =
  supabase.createClient(
    cfg.SUPABASE_URL,
    cfg.SUPABASE_PUBLISHABLE_KEY
  );


/* =====================================================
   URL
===================================================== */

const params =
  new URLSearchParams(
    window.location.search
  );


const requestedRegistrationId =
  params.get(
    "registration_id"
  );


/* =====================================================
   ELEMENTS
===================================================== */

const form =
  document.getElementById(
    "sessionForm"
  );


const registrationSelect =
  document.getElementById(
    "registrationId"
  );


const studentName =
  document.getElementById(
    "studentName"
  );


const coachName =
  document.getElementById(
    "coachName"
  );


const sessionNo =
  document.getElementById(
    "sessionNo"
  );


const sessionDate =
  document.getElementById(
    "sessionDate"
  );


const startTime =
  document.getElementById(
    "startTime"
  );


const duration =
  document.getElementById(
    "duration"
  );


const areaSelect =
  document.getElementById(
    "areaSelect"
  );


const wardSelect =
  document.getElementById(
    "wardSelect"
  );


const courtSelect =
  document.getElementById(
    "courtId"
  );


const courtName =
  document.getElementById(
    "courtName"
  );


const courtInfo =
  document.getElementById(
    "courtInfo"
  );


const courtDisplayName =
  document.getElementById(
    "courtDisplayName"
  );


const courtCostDisplay =
  document.getElementById(
    "courtCostDisplay"
  );


const courtAddressDisplay =
  document.getElementById(
    "courtAddressDisplay"
  );


const note =
  document.getElementById(
    "note"
  );


const submitBtn =
  document.getElementById(
    "submitBtn"
  );


const message =
  document.getElementById(
    "message"
  );


const backLink =
  document.getElementById(
    "backLink"
  );


/* =====================================================
   DATA
===================================================== */

let registrations = [];

let courts = [];


/* =====================================================
   HELPERS
===================================================== */

function showMessage(
  text,
  isError = false
) {

  message.textContent =
    text || "";


  message.style.color =
    isError
      ? "#ffb4b4"
      : "#b9ff18";

}


function money(value) {

  return (
    Number(value || 0)
      .toLocaleString("vi-VN")
    +
    "đ"
  );

}


function resetCourt() {

  courts = [];


  courtSelect.disabled =
    true;


  courtSelect.innerHTML =
    `
      <option value="">
        Chọn khu vực trước
      </option>
    `;


  courtName.value =
    "";


  courtInfo.style.display =
    "none";


  courtDisplayName.textContent =
    "";


  courtCostDisplay.textContent =
    "";


  courtAddressDisplay.textContent =
    "";

}


/* =====================================================
   CHECK ADMIN
===================================================== */

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


/* =====================================================
   LOAD TỈNH / THÀNH
===================================================== */

async function loadAreas() {


  areaSelect.disabled =
    true;


  areaSelect.innerHTML =
    `
      <option value="">
        Đang tải Tỉnh/Thành...
      </option>
    `;


  const {
    data,
    error
  } =
    await sb
      .from("dm_khu_vuc")
      .select(
        "ma_khu_vuc, tinh_thanh"
      )
      .eq(
        "dang_hoat_dong",
        true
      )
      .order(
        "tinh_thanh",
        {
          ascending: true
        }
      );


  if (error) {


    console.error(
      "Lỗi tải Tỉnh/Thành:",
      error
    );


    areaSelect.innerHTML =
      `
        <option value="">
          Không tải được Tỉnh/Thành
        </option>
      `;


    showMessage(
      "Không tải được danh sách Tỉnh/Thành.",
      true
    );


    return false;

  }


  areaSelect.innerHTML =
    `
      <option value="">
        Chọn Tỉnh/Thành
      </option>
    `;


  (data || []).forEach(
    area => {


      const option =
        document.createElement(
          "option"
        );


      option.value =
        area.tinh_thanh;


      option.textContent =
        area.tinh_thanh;


      option.dataset.maKhuVuc =
        area.ma_khu_vuc;


      areaSelect.appendChild(
        option
      );

    }
  );


  areaSelect.disabled =
    false;


  return true;

}


/* =====================================================
   LOAD PHƯỜNG / XÃ
===================================================== */

async function loadWards(
  maKhuVuc,
  selectedWard = ""
) {


  wardSelect.disabled =
    true;


  wardSelect.innerHTML =
    `
      <option value="">
        Đang tải Phường/Xã...
      </option>
    `;


  const {
    data,
    error
  } =
    await sb
      .from("dm_xa_phuong")
      .select(
        "ma_xa_phuong, ten_xa_phuong"
      )
      .eq(
        "ma_khu_vuc",
        maKhuVuc
      )
      .eq(
        "dang_hoat_dong",
        true
      )
      .order(
        "ten_xa_phuong",
        {
          ascending: true
        }
      );


  if (error) {


    console.error(
      "Lỗi tải Phường/Xã:",
      error
    );


    wardSelect.innerHTML =
      `
        <option value="">
          Không tải được Phường/Xã
        </option>
      `;


    showMessage(
      "Không tải được danh sách Phường/Xã.",
      true
    );


    return false;

  }


  wardSelect.innerHTML =
    `
      <option value="">
        Tất cả Phường/Xã
      </option>
    `;


  (data || []).forEach(
    ward => {


      const option =
        document.createElement(
          "option"
        );


      option.value =
        ward.ten_xa_phuong;


      option.textContent =
        ward.ten_xa_phuong;


      option.dataset.maXaPhuong =
        ward.ma_xa_phuong;


      wardSelect.appendChild(
        option
      );

    }
  );


  wardSelect.disabled =
    false;


  if (selectedWard) {

    wardSelect.value =
      selectedWard;

  }


  return true;

}


/* =====================================================
   LOAD SÂN THEO KHU VỰC
===================================================== */

async function loadCourts() {


  resetCourt();


  const selectedArea =
    areaSelect.value.trim();


  const selectedWard =
    wardSelect.value.trim();


  if (!selectedArea) {


    courtSelect.innerHTML =
      `
        <option value="">
          Chọn Tỉnh/Thành trước
        </option>
      `;


    return;

  }


  courtSelect.innerHTML =
    `
      <option value="">
        Đang tải danh sách sân...
      </option>
    `;


  let query =
    sb
      .from("courts")
      .select(`
        id,
        court_code,
        name,
        area,
        ward,
        address,
        price_per_session,
        status
      `)
      .eq(
        "status",
        "Hoạt động"
      )
      .eq(
        "area",
        selectedArea
      );


  /*
    Nếu đã chọn Phường/Xã
    thì lọc sâu thêm.
  */

  if (selectedWard) {

    query =
      query.eq(
        "ward",
        selectedWard
      );

  }


  const {
    data,
    error
  } =
    await query
      .order(
        "name",
        {
          ascending: true
        }
      );


  if (error) {


    console.error(
      "Lỗi tải sân:",
      error
    );


    courtSelect.innerHTML =
      `
        <option value="">
          Không tải được danh sách sân
        </option>
      `;


    showMessage(
      "Không tải được danh sách sân.",
      true
    );


    return;

  }


  courts =
    data || [];


  if (
    courts.length === 0
  ) {


    courtSelect.disabled =
      true;


    courtSelect.innerHTML =
      `
        <option value="">
          Chưa có sân tại khu vực này
        </option>
      `;


    courtInfo.style.display =
      "none";


    return;

  }


  courtSelect.innerHTML =
    `
      <option value="">
        Chọn sân học
      </option>
    `;


  courts.forEach(
    court => {


      const option =
        document.createElement(
          "option"
        );


      option.value =
        court.id;


      let locationText =
        court.ward
          ?
          ` · ${court.ward}`
          :
          "";


      option.textContent =
        `${court.name}${locationText} · ${money(
          court.price_per_session
        )}/buổi`;


      courtSelect.appendChild(
        option
      );

    }
  );


  courtSelect.disabled =
    false;


  /*
    Nếu khu vực chỉ có đúng 1 sân
    thì tự chọn luôn.
  */

  if (
    courts.length === 1
  ) {


    courtSelect.value =
      String(
        courts[0].id
      );


    applyCourt();

  }

}


/* =====================================================
   HIỂN THỊ SÂN ĐÃ CHỌN
===================================================== */

function applyCourt() {


  const court =
    courts.find(
      item =>
        Number(item.id) ===
        Number(
          courtSelect.value
        )
    );


  if (!court) {


    courtName.value =
      "";


    courtInfo.style.display =
      "none";


    return;

  }


  courtName.value =
    court.name || "";


  courtDisplayName.textContent =
    court.name || "";


  courtCostDisplay.textContent =
    `Chi phí sân: ${money(
      court.price_per_session
    )} / buổi`;


  const addressParts =
    [
      court.address,
      court.ward,
      court.area
    ]
      .filter(Boolean);


  courtAddressDisplay.textContent =
    addressParts.join(" · ");


  courtInfo.style.display =
    "block";

}


/* =====================================================
   EVENT KHU VỰC
===================================================== */

areaSelect.addEventListener(
  "change",
  async function () {


    showMessage("");


    resetCourt();


    wardSelect.disabled =
      true;


    wardSelect.innerHTML =
      `
        <option value="">
          Chọn Tỉnh/Thành trước
        </option>
      `;


    const selectedOption =
      areaSelect.options[
        areaSelect.selectedIndex
      ];


    const maKhuVuc =
      selectedOption
        ?.dataset
        ?.maKhuVuc;


    if (!maKhuVuc) {

      return;

    }


    await loadWards(
      maKhuVuc
    );


    /*
      Chưa cần chọn phường.
      Ngay sau khi chọn tỉnh
      đã có thể xem toàn bộ sân
      của tỉnh đó.
    */

    await loadCourts();

  }
);


/* =====================================================
   EVENT PHƯỜNG / XÃ
===================================================== */

wardSelect.addEventListener(
  "change",
  async function () {


    showMessage("");


    await loadCourts();

  }
);


/* =====================================================
   EVENT SÂN
===================================================== */

courtSelect.addEventListener(
  "change",
  applyCourt
);


/* =====================================================
   LOAD ĐĂNG KÝ ĐÃ DUYỆT
===================================================== */

async function loadRegistrations() {


  registrationSelect.disabled =
    true;


  registrationSelect.innerHTML =
    `
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
          full_name,
          preferred_area,
          preferred_ward
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
      .order(
        "id",
        {
          ascending: false
        }
      );


  if (error) {


    console.error(
      "Lỗi tải đăng ký:",
      error
    );


    registrationSelect.innerHTML =
      `
        <option value="">
          Không tải được đăng ký
        </option>
      `;


    showMessage(
      "Không tải được danh sách đăng ký đã duyệt: "
      +
      (
        error.message ||
        error
      ),
      true
    );


    return false;

  }


  registrations =
    data || [];


  registrationSelect.innerHTML =
    `
      <option value="">
        Chọn đăng ký học
      </option>
    `;


  registrations.forEach(
    registration => {


      const student =
        registration.students || {};


      const option =
        document.createElement(
          "option"
        );


      option.value =
        registration.id;


      option.textContent =
        `${
          registration.registration_code ||
          `DK${registration.id}`
        } · ${
          student.full_name ||
          student.student_code ||
          "Học viên"
        }`;


      registrationSelect.appendChild(
        option
      );

    }
  );


  registrationSelect.disabled =
    false;


  /*
    Nếu mở từ Chi tiết đăng ký
    thì tự chọn đăng ký.
  */

  if (
    requestedRegistrationId
  ) {


    const exists =
      registrations.some(
        item =>
          Number(item.id) ===
          Number(
            requestedRegistrationId
          )
      );


    if (exists) {


      registrationSelect.value =
        String(
          requestedRegistrationId
        );


      await applyRegistration();

    }

  }


  return true;

}


/* =====================================================
   NEXT SESSION NO
===================================================== */

async function getNextSessionNo(
  registrationId
) {


  const {
    data,
    error
  } =
    await sb
      .from("class_sessions")
      .select(
        "session_no"
      )
      .eq(
        "registration_id",
        registrationId
      )
      .order(
        "session_no",
        {
          ascending: false
        }
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
    )
    +
    1
  );

}


/* =====================================================
   NEXT SESSION CODE
===================================================== */

async function getNextSessionCode() {


  const {
    data,
    error
  } =
    await sb
      .from("class_sessions")
      .select(
        "session_code"
      );


  if (error) {

    throw error;

  }


  let max =
    0;


  (data || []).forEach(
    row => {


      const match =
        String(
          row.session_code || ""
        ).match(
          /^BH(\d+)$/i
        );


      if (!match) {

        return;

      }


      const number =
        Number(
          match[1]
        );


      if (
        number > max
      ) {

        max =
          number;

      }

    }
  );


  return (
    "BH"
    +
    String(
      max + 1
    ).padStart(
      3,
      "0"
    )
  );

}


/* =====================================================
   ÁP DỤNG KHU VỰC HỌC VIÊN
===================================================== */

async function applyStudentLocation(
  preferredArea,
  preferredWard
) {


  resetCourt();


  /*
    Nếu học viên chưa có khu vực,
    Admin tự chọn.
  */

  if (!preferredArea) {


    areaSelect.value =
      "";


    wardSelect.disabled =
      true;


    wardSelect.innerHTML =
      `
        <option value="">
          Chọn Tỉnh/Thành trước
        </option>
      `;


    return;

  }


  areaSelect.value =
    preferredArea;


  const selectedOption =
    areaSelect.options[
      areaSelect.selectedIndex
    ];


  const maKhuVuc =
    selectedOption
      ?.dataset
      ?.maKhuVuc;


  if (!maKhuVuc) {


    areaSelect.value =
      "";


    return;

  }


  await loadWards(
    maKhuVuc,
    preferredWard || ""
  );


  /*
    Sau khi lấy tỉnh/phường của học viên,
    tự động tải sân phù hợp.
  */

  await loadCourts();

}


/* =====================================================
   APPLY REGISTRATION
===================================================== */

async function applyRegistration() {


  showMessage("");


  const registration =
    registrations.find(
      item =>
        Number(item.id) ===
        Number(
          registrationSelect.value
        )
    );


  if (!registration) {


    studentName.value =
      "";


    coachName.value =
      "";


    sessionNo.value =
      "";


    resetCourt();


    return;

  }


  const student =
    registration.students || {};


  const coach =
    registration.coaches || {};


  studentName.value =
    student.full_name ||
    student.student_code ||
    "—";


  coachName.value =
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


  /*
    Tự tính số buổi tiếp theo.
  */

  try {


    const nextNo =
      await getNextSessionNo(
        registration.id
      );


    sessionNo.value =
      nextNo;


  }
  catch (error) {


    console.error(
      error
    );


    sessionNo.value =
      "";

  }


  /*
    Nếu chưa nhập ngày,
    lấy ngày bắt đầu của đăng ký.
  */

  if (
    !sessionDate.value &&
    registration.start_date
  ) {

    sessionDate.value =
      registration.start_date;

  }


  /*
    Link quay lại đăng ký.
  */

  backLink.href =
    `./registration-detail.html?id=${
      encodeURIComponent(
        registration.id
      )
    }`;


  /*
    QUAN TRỌNG:

    Tự lấy khu vực muốn học
    của học viên.
  */

  await applyStudentLocation(
    student.preferred_area,
    student.preferred_ward
  );

}


/* =====================================================
   EVENT REGISTRATION
===================================================== */

registrationSelect.addEventListener(
  "change",
  applyRegistration
);


/* =====================================================
   SUBMIT
===================================================== */

form.addEventListener(
  "submit",
  async function (event) {


    event.preventDefault();


    showMessage(
      "Đang tạo buổi học..."
    );


    const registration =
      registrations.find(
        item =>
          Number(item.id) ===
          Number(
            registrationSelect.value
          )
      );


    if (!registration) {


      showMessage(
        "Hãy chọn đăng ký học.",
        true
      );


      return;

    }


    if (
      !sessionDate.value
    ) {


      showMessage(
        "Hãy chọn ngày học.",
        true
      );


      return;

    }


    if (
      !startTime.value
    ) {


      showMessage(
        "Hãy chọn giờ bắt đầu.",
        true
      );


      return;

    }


    if (
      !areaSelect.value
    ) {


      showMessage(
        "Hãy chọn Tỉnh/Thành.",
        true
      );


      return;

    }


    const selectedCourt =
      courts.find(
        item =>
          Number(item.id) ===
          Number(
            courtSelect.value
          )
      );


    if (!selectedCourt) {


      showMessage(
        "Hãy chọn sân học.",
        true
      );


      return;

    }


    if (
      !registration.coach_id
    ) {


      showMessage(
        "Đăng ký này chưa được gán Coach.",
        true
      );


      return;

    }


    submitBtn.disabled =
      true;


    try {


      const nextCode =
        await getNextSessionCode();


      const nextNo =
        Number(
          sessionNo.value
        )
        ||
        await getNextSessionNo(
          registration.id
        );


      const {
        data,
        error
      } =
        await sb
          .from("class_sessions")
          .insert({

            session_code:
              nextCode,

            registration_id:
              Number(
                registration.id
              ),

            coach_id:
              Number(
                registration.coach_id
              ),

            session_no:
              nextNo,

            session_date:
              sessionDate.value,

            start_time:
              startTime.value,

            duration_minutes:
              Number(
                duration.value || 60
              ),

            /*
              Chỉ truyền court_id.
              Trigger database sẽ tự lấy
              court_cost từ bảng courts.
            */

            court_id:
              Number(
                selectedCourt.id
              ),

            /*
              Giữ court_name để tương thích
              với các trang hiện tại.
            */

            court_name:
              selectedCourt.name,

            status:
              "Chờ học",

            note:
              note.value.trim()
              ||
              null

          })
          .select(
            "id, session_code"
          )
          .single();


      if (error) {

        throw error;

      }


      showMessage(
        `✓ Đã tạo ${
          data.session_code
        } thành công.`
      );


      setTimeout(
        () => {


          window.location.href =
            `./session-detail.html?id=${
              encodeURIComponent(
                data.id
              )
            }`;


        },
        650
      );


    }
    catch (error) {


      console.error(
        error
      );


      showMessage(
        "Không tạo được buổi học: "
        +
        (
          error.message ||
          error
        ),
        true
      );


    }
    finally {


      submitBtn.disabled =
        false;

    }

  }
);


/* =====================================================
   START
===================================================== */

async function init() {


  const ok =
    await checkAdmin();


  if (!ok) {

    return;

  }


  /*
    Bắt buộc load danh mục khu vực trước,
    vì khi load đăng ký có thể phải
    tự chọn tỉnh/phường của học viên.
  */

  const areaLoaded =
    await loadAreas();


  if (!areaLoaded) {

    return;

  }


  await loadRegistrations();

}


init();
