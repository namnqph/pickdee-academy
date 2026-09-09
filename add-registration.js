const config =
  window.PICKDEE_CONFIG || {};

const supabaseClient =
  window.supabase.createClient(
    config.SUPABASE_URL,
    config.SUPABASE_PUBLISHABLE_KEY
  );


/* ======================================
   THAM SỐ URL
====================================== */

const params =
  new URLSearchParams(
    window.location.search
  );

const studentId =
  params.get("student_id");


/* ======================================
   ELEMENTS
====================================== */

const packageSelect =
  document.getElementById(
    "packageName"
  );

const coachSelect =
  document.getElementById(
    "coachId"
  );

const startDateInput =
  document.getElementById(
    "startDate"
  );

const preferredAreaSelect =
  document.getElementById(
    "preferredArea"
  );

const preferredWardSelect =
  document.getElementById(
    "preferredWard"
  );

const message =
  document.getElementById(
    "message"
  );


/* PHẦN THÔNG TIN GÓI */

const packageInfo =
  document.getElementById(
    "packageInfo"
  );

const packageGroupSize =
  document.getElementById(
    "packageGroupSize"
  );

const packageUnitPrice =
  document.getElementById(
    "packageUnitPrice"
  );

const packageSessions =
  document.getElementById(
    "packageSessions"
  );

const packageDuration =
  document.getElementById(
    "packageDuration"
  );

const packagePrice =
  document.getElementById(
    "packagePrice"
  );

const packageEndDate =
  document.getElementById(
    "packageEndDate"
  );

const packageCourtNote =
  document.getElementById(
    "packageCourtNote"
  );

const customSessionsWrap =
  document.getElementById(
    "customSessionsWrap"
  );

const purchasedSessionsInput =
  document.getElementById(
    "purchasedSessions"
  );


/* ======================================
   STATE
====================================== */

let currentStudent = null;

let packages = [];

let currentPackage = null;


/* ======================================
   HELPERS
====================================== */

function formatMoney(value) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "—";
  }

  return (
    Number(value)
      .toLocaleString("vi-VN") +
    "đ"
  );
}


function formatDateVN(value) {

  if (!value) {
    return "—";
  }

  const text =
    String(value);

  if (
    /^\d{4}-\d{2}-\d{2}$/
      .test(text)
  ) {

    const [
      year,
      month,
      day
    ] =
      text.split("-");

    return `${day}/${month}/${year}`;
  }

  return text;
}


function addDaysToDate(
  dateString,
  days
) {

  if (
    !dateString ||
    !days
  ) {
    return null;
  }

  const [
    year,
    month,
    day
  ] =
    dateString
      .split("-")
      .map(Number);

  const date =
    new Date(
      year,
      month - 1,
      day
    );

  date.setDate(
    date.getDate() +
    Number(days)
  );

  const yyyy =
    date.getFullYear();

  const mm =
    String(
      date.getMonth() + 1
    ).padStart(2, "0");

  const dd =
    String(
      date.getDate()
    ).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
}


function isCustomPackage(pkg) {

  if (!pkg) {
    return false;
  }

  return (
    pkg.package_code === "TYC" ||
    pkg.total_sessions === null
  );
}


/* ======================================
   RESET PREVIEW GÓI
====================================== */

function resetPackagePreview() {

  currentPackage = null;

  packageInfo.style.display =
    "none";

  customSessionsWrap.style.display =
    "none";

  purchasedSessionsInput.required =
    false;

  purchasedSessionsInput.value =
    "";

  packageGroupSize.textContent =
    "—";

  packageUnitPrice.textContent =
    "—";

  packageSessions.textContent =
    "—";

  packageDuration.textContent =
    "—";

  packagePrice.textContent =
    "—";

  packageEndDate.textContent =
    "—";
}


/* ======================================
   HIỂN THỊ PREVIEW GÓI
====================================== */

function renderPackagePreview() {

  if (!currentPackage) {

    resetPackagePreview();

    return;
  }


  packageInfo.style.display =
    "block";


  const groupSize =
    Number(
      currentPackage.group_size || 1
    );


  packageGroupSize.textContent =
    groupSize === 1
      ? "1 người"
      : `${groupSize} người`;


  packageUnitPrice.textContent =
    `${formatMoney(
      currentPackage.unit_price
    )}/người/buổi`;


  const custom =
    isCustomPackage(
      currentPackage
    );


  let sessions = null;

  let totalPrice = null;


  /* ================================
     THEO YÊU CẦU
  ================================= */

  if (custom) {

    customSessionsWrap.style.display =
      "block";

    purchasedSessionsInput.required =
      true;


    const entered =
      Number(
        purchasedSessionsInput.value
      );


    if (
      Number.isInteger(entered) &&
      entered > 0
    ) {

      sessions = entered;

      totalPrice =
        sessions *
        Number(
          currentPackage.unit_price || 0
        );

    }

  }


  /* ================================
     GÓI CỐ ĐỊNH
  ================================= */

  else {

    customSessionsWrap.style.display =
      "none";

    purchasedSessionsInput.required =
      false;

    sessions =
      Number(
        currentPackage.total_sessions
      );

    totalPrice =
      Number(
        currentPackage.price
      );

  }


  /* ================================
     SỐ BUỔI
  ================================= */

  packageSessions.textContent =
    sessions
      ? `${sessions} buổi`
      : "Nhập số buổi mua";


  /* ================================
     THỜI HẠN
     3 NGÀY / BUỔI
  ================================= */

  const durationDays =
    sessions
      ? sessions * 3
      : null;


  packageDuration.textContent =
    durationDays
      ? `${durationDays} ngày`
      : "—";


  /* ================================
     HỌC PHÍ
  ================================= */

  packagePrice.textContent =
    totalPrice
      ? formatMoney(totalPrice)
      : "—";


  /* ================================
     NGÀY HẾT HẠN
  ================================= */

  if (
    startDateInput.value &&
    durationDays
  ) {

    const endDate =
      addDaysToDate(
        startDateInput.value,
        durationDays
      );

    packageEndDate.textContent =
      formatDateVN(endDate);

  }

  else {

    packageEndDate.textContent =
      "—";
  }


  /* ================================
     TIỀN SÂN
  ================================= */

  if (
    currentPackage.includes_court
  ) {

    packageCourtNote.textContent =
      "✓ Học phí đã bao gồm tiền sân. Học viên không phải trả thêm phí sân.";

    packageCourtNote.style.display =
      "block";

  }

  else {

    packageCourtNote.textContent =
      currentPackage.price_note ||
      "Học phí chưa bao gồm tiền sân.";

    packageCourtNote.style.display =
      "block";

  }

}


/* ======================================
   KHỞI ĐỘNG
====================================== */

async function init() {

  if (!studentId) {

    alert(
      "Thiếu ID học viên."
    );

    window.location.href =
      "./students.html";

    return;
  }


  const {
    data: { session }
  } =
    await supabaseClient
      .auth
      .getSession();


  if (!session) {

    window.location.href =
      "./login.html";

    return;
  }


  document.getElementById(
    "userEmail"
  ).textContent =
    session.user.email || "";


  const {
    data: profile,
    error: profileError
  } =
    await supabaseClient
      .from("profiles")
      .select("role")
      .eq(
        "id",
        session.user.id
      )
      .single();


  if (
    profileError ||
    !profile ||
    profile.role !== "admin"
  ) {

    window.location.href =
      "./login.html";

    return;
  }


  await loadPackages();

  await loadAreas();

  await loadStudent();
}


/* ======================================
   LOAD 5 GÓI HỌC THẬT
====================================== */

async function loadPackages() {

  packageSelect.disabled = true;

  packageSelect.innerHTML =
    `
      <option value="">
        Đang tải gói học...
      </option>
    `;


  const {
    data,
    error
  } =
    await supabaseClient
      .from("packages")
      .select(`
        id,
        package_code,
        package_name,
        total_sessions,
        unit_price,
        group_size,
        price,
        includes_court,
        price_note,
        status
      `)
      .eq(
        "status",
        "Hoạt động"
      )
      .in(
        "package_code",
        [
          "CB12",
          "NC12",
          "CB12N2",
          "NC12N2",
          "TYC"
        ]
      )
      .order(
        "id",
        { ascending: true }
      );


  if (error) {

    console.error(
      "Lỗi tải gói học:",
      error
    );

    packageSelect.innerHTML =
      `
        <option value="">
          Không tải được gói học
        </option>
      `;

    message.textContent =
      "Không tải được bảng giá gói học: " +
      error.message;

    message.className =
      "message error";

    return;
  }


  packages =
    data || [];


  packageSelect.innerHTML =
    `
      <option value="">
        — Chọn gói học —
      </option>
    `;


  packages.forEach(pkg => {

    const option =
      document.createElement(
        "option"
      );


    option.value =
      String(pkg.id);


    option.dataset.packageName =
      pkg.package_name;


    let label =
      pkg.package_name;


    if (
      pkg.package_code === "TYC"
    ) {

      label +=
        ` · ${formatMoney(
          pkg.unit_price
        )}/buổi`;

    }

    else if (
      pkg.price !== null
    ) {

      label +=
        ` · ${formatMoney(
          pkg.price
        )}/người`;

    }


    option.textContent =
      label;


    packageSelect.appendChild(
      option
    );
  });


  packageSelect.disabled =
    false;


  resetPackagePreview();
}


/* ======================================
   KHI CHỌN GÓI
====================================== */

packageSelect.addEventListener(
  "change",
  () => {

    const packageId =
      Number(
        packageSelect.value
      );


    if (!packageId) {

      resetPackagePreview();

      return;
    }


    currentPackage =
      packages.find(
        pkg =>
          Number(pkg.id) ===
          packageId
      ) || null;


    purchasedSessionsInput.value =
      "";


    renderPackagePreview();
  }
);


/* ======================================
   THEO YÊU CẦU:
   NHẬP SỐ BUỔI
====================================== */

purchasedSessionsInput
  .addEventListener(
    "input",
    () => {

      renderPackagePreview();

    }
  );


/* ======================================
   KHI ĐỔI NGÀY BẮT ĐẦU
====================================== */

startDateInput.addEventListener(
  "change",
  () => {

    renderPackagePreview();

  }
);


/* ======================================
   LOAD 34 TỈNH / THÀNH
====================================== */

async function loadAreas() {

  preferredAreaSelect.disabled =
    true;


  preferredAreaSelect.innerHTML =
    `
      <option value="">
        Đang tải Tỉnh/Thành...
      </option>
    `;


  const {
    data,
    error
  } =
    await supabaseClient
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
        { ascending: true }
      );


  if (error) {

    console.error(
      "Lỗi tải Tỉnh/Thành:",
      error
    );

    preferredAreaSelect.innerHTML =
      `
        <option value="">
          Không tải được Tỉnh/Thành
        </option>
      `;

    return;
  }


  preferredAreaSelect.innerHTML =
    `
      <option value="">
        Chọn Tỉnh/Thành
      </option>
    `;


  data.forEach(area => {

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


    preferredAreaSelect
      .appendChild(option);
  });


  preferredAreaSelect.disabled =
    false;
}


/* ======================================
   LOAD XÃ / PHƯỜNG
====================================== */

async function loadWards(
  maKhuVuc,
  selectedWard = ""
) {

  preferredWardSelect.disabled =
    true;


  preferredWardSelect.innerHTML =
    `
      <option value="">
        Đang tải Xã/Phường...
      </option>
    `;


  const {
    data,
    error
  } =
    await supabaseClient
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
        { ascending: true }
      );


  if (error) {

    console.error(
      "Lỗi tải Xã/Phường:",
      error
    );

    preferredWardSelect.innerHTML =
      `
        <option value="">
          Không tải được Xã/Phường
        </option>
      `;

    return;
  }


  preferredWardSelect.innerHTML =
    `
      <option value="">
        Chọn Xã/Phường
      </option>
    `;


  data.forEach(ward => {

    const option =
      document.createElement(
        "option"
      );


    option.value =
      ward.ten_xa_phuong;


    option.textContent =
      ward.ten_xa_phuong;


    preferredWardSelect
      .appendChild(option);
  });


  preferredWardSelect.disabled =
    false;


  if (selectedWard) {

    preferredWardSelect.value =
      selectedWard;
  }
}


/* ======================================
   LOAD COACH PHÙ HỢP
====================================== */

async function loadCoaches(
  area = "",
  ward = ""
) {

  coachSelect.disabled =
    true;


  coachSelect.innerHTML =
    `
      <option value="">
        Đang tải Coach...
      </option>
    `;


  if (!area) {

    coachSelect.innerHTML =
      `
        <option value="">
          Chưa phân Coach
        </option>
      `;

    coachSelect.disabled =
      false;

    return;
  }


  const {
    data,
    error
  } =
    await supabaseClient
      .from("coaches")
      .select(`
        id,
        coach_code,
        full_name,
        preferred_area,
        preferred_ward,
        status
      `)
      .eq(
        "preferred_area",
        area
      )
      .in(
        "status",
        [
          "Hoạt động",
          "Đang hoạt động"
        ]
      );


  if (error) {

    console.error(
      "Lỗi tải Coach:",
      error
    );

    coachSelect.innerHTML =
      `
        <option value="">
          Không tải được Coach
        </option>
      `;

    return;
  }


  const coaches =
    [...(data || [])]
      .sort(
        (a, b) => {

          const aSameWard =
            ward &&
            a.preferred_ward === ward
              ? 1
              : 0;


          const bSameWard =
            ward &&
            b.preferred_ward === ward
              ? 1
              : 0;


          if (
            aSameWard !== bSameWard
          ) {

            return (
              bSameWard -
              aSameWard
            );
          }


          return (
            a.full_name || ""
          ).localeCompare(
            b.full_name || "",
            "vi"
          );
        }
      );


  coachSelect.innerHTML =
    `
      <option value="">
        Chưa phân Coach
      </option>
    `;


  coaches.forEach(coach => {

    const option =
      document.createElement(
        "option"
      );


    option.value =
      coach.id;


    let label =
      `${coach.coach_code || ""} - ${coach.full_name || ""}`;


    if (
      ward &&
      coach.preferred_ward === ward
    ) {

      label +=
        " · Cùng Xã/Phường";

    }

    else if (
      coach.preferred_ward
    ) {

      label +=
        ` · ${coach.preferred_ward}`;
    }


    option.textContent =
      label;


    coachSelect.appendChild(
      option
    );
  });


  coachSelect.disabled =
    false;
}


/* ======================================
   KHI ĐỔI TỈNH
====================================== */

preferredAreaSelect
  .addEventListener(
    "change",
    async () => {

      preferredWardSelect.disabled =
        true;


      preferredWardSelect.innerHTML =
        `
          <option value="">
            Chọn Tỉnh/Thành trước
          </option>
        `;


      const selectedOption =
        preferredAreaSelect.options[
          preferredAreaSelect
            .selectedIndex
        ];


      const maKhuVuc =
        selectedOption
          ?.dataset
          ?.maKhuVuc;


      if (!maKhuVuc) {

        await loadCoaches(
          "",
          ""
        );

        return;
      }


      await loadWards(
        maKhuVuc
      );


      await loadCoaches(
        preferredAreaSelect.value,
        ""
      );
    }
  );


/* ======================================
   KHI ĐỔI XÃ / PHƯỜNG
====================================== */

preferredWardSelect
  .addEventListener(
    "change",
    async () => {

      await loadCoaches(
        preferredAreaSelect.value,
        preferredWardSelect.value
      );
    }
  );


/* ======================================
   LOAD HỌC VIÊN
====================================== */

async function loadStudent() {

  const {
    data,
    error
  } =
    await supabaseClient
      .from("students")
      .select(`
        id,
        student_code,
        full_name,
        preferred_area,
        preferred_ward
      `)
      .eq(
        "id",
        studentId
      )
      .single();


  if (
    error ||
    !data
  ) {

    console.error(error);

    alert(
      "Không tải được học viên."
    );

    return;
  }


  currentStudent =
    data;


  document.getElementById(
    "studentName"
  ).textContent =
    data.full_name || "—";


  document.getElementById(
    "studentCode"
  ).textContent =
    data.student_code
      ? ` · ${data.student_code}`
      : "";


  document.getElementById(
    "backLink"
  ).href =
    `./student-detail.html?id=${encodeURIComponent(
      studentId
    )}`;


  /* TỰ LẤY KHU VỰC HỌC VIÊN */

  preferredAreaSelect.value =
    data.preferred_area || "";


  if (data.preferred_area) {

    const selectedOption =
      preferredAreaSelect.options[
        preferredAreaSelect
          .selectedIndex
      ];


    const maKhuVuc =
      selectedOption
        ?.dataset
        ?.maKhuVuc;


    if (maKhuVuc) {

      await loadWards(
        maKhuVuc,
        data.preferred_ward || ""
      );
    }
  }


  await loadCoaches(
    data.preferred_area || "",
    data.preferred_ward || ""
  );
}


/* ======================================
   TẠO ĐĂNG KÝ
====================================== */

document
  .getElementById(
    "registrationForm"
  )
  .addEventListener(
    "submit",
    async event => {

      event.preventDefault();


      const saveBtn =
        document.getElementById(
          "saveBtn"
        );


      message.textContent =
        "";

      message.className =
        "message";


      /* ================================
         PACKAGE
      ================================= */

      const packageId =
        Number(
          packageSelect.value
        );


      if (!packageId) {

        message.textContent =
          "Hãy chọn gói học.";

        message.className =
          "message error";

        return;
      }


      const selectedPackage =
        packages.find(
          pkg =>
            Number(pkg.id) ===
            packageId
        );


      if (!selectedPackage) {

        message.textContent =
          "Không tìm thấy thông tin gói học.";

        message.className =
          "message error";

        return;
      }


      const packageName =
        selectedPackage
          .package_name;


      /* ================================
         SỐ BUỔI THỰC MUA
      ================================= */

      let purchasedSessions =
        null;


      if (
        isCustomPackage(
          selectedPackage
        )
      ) {

        purchasedSessions =
          Number(
            purchasedSessionsInput
              .value
          );


        if (
          !Number.isInteger(
            purchasedSessions
          ) ||
          purchasedSessions < 1
        ) {

          message.textContent =
            "Hãy nhập số buổi mua cho gói Theo yêu cầu.";

          message.className =
            "message error";

          purchasedSessionsInput
            .focus();

          return;
        }

      }

      else {

        purchasedSessions =
          Number(
            selectedPackage
              .total_sessions
          );
      }


      /* ================================
         CÁC TRƯỜNG CÒN LẠI
      ================================= */

      const coachId =
        coachSelect.value;


      const startDate =
        startDateInput.value;


      const preferredArea =
        preferredAreaSelect
          .value
          .trim();


      const preferredWard =
        preferredWardSelect
          .value
          .trim();


      const referralCode =
        document.getElementById(
          "referralCode"
        ).value.trim();


      const note =
        document.getElementById(
          "note"
        ).value.trim();


      /* ================================
         SAVE
      ================================= */

      saveBtn.disabled =
        true;


      saveBtn.textContent =
        "ĐANG LƯU...";


      const {
        data,
        error
      } =
        await supabaseClient
          .from("registrations")
          .insert({

            student_id:
              Number(studentId),

            package_id:
              packageId,

            /*
              Giữ package_name để tương thích
              các màn hình/dữ liệu cũ.
            */
            package_name:
              packageName,

            /*
              Gói cố định:
              12

              Theo yêu cầu:
              số buổi Admin nhập.

              Trigger Supabase sẽ tự tính:
              tuition_fee
              end_date
            */
            purchased_sessions:
              purchasedSessions,

            coach_id:
              coachId
                ? Number(coachId)
                : null,

            start_date:
              startDate || null,

            preferred_area:
              preferredArea || null,

            preferred_ward:
              preferredWard || null,

            status:
              "Mới đăng ký",

            source:
              "Admin Web",

            referral_code:
              referralCode || null,

            note:
              note || null

          })
          .select(`
            id,
            registration_code,
            package_id,
            package_name,
            purchased_sessions,
            tuition_fee,
            start_date,
            end_date
          `)
          .single();


      if (error) {

        console.error(error);


        message.textContent =
          "Không tạo được đăng ký: " +
          error.message;


        message.className =
          "message error";


        saveBtn.disabled =
          false;


        saveBtn.textContent =
          "TẠO ĐĂNG KÝ HỌC";


        return;
      }


      message.textContent =
        `Đã tạo ${data.registration_code} · ` +
        `${data.package_name} · ` +
        `${formatMoney(
          data.tuition_fee
        )}`;


      message.className =
        "message success";


      setTimeout(
        () => {

          window.location.href =
            `./student-detail.html?id=${encodeURIComponent(
              studentId
            )}`;

        },
        900
      );
    }
  );


/* ======================================
   START
====================================== */

init();
