const config =
  window.PICKDEE_CONFIG || {};

const supabaseClient =
  window.supabase.createClient(
    config.SUPABASE_URL,
    config.SUPABASE_PUBLISHABLE_KEY
  );

const params =
  new URLSearchParams(window.location.search);

const studentId =
  params.get("student_id");

let currentStudent = null;

const packageSelect =
  document.getElementById("packageName");

const coachSelect =
  document.getElementById("coachId");

const startDateInput =
  document.getElementById("startDate");

const preferredAreaSelect =
  document.getElementById("preferredArea");

const preferredWardSelect =
  document.getElementById("preferredWard");

const message =
  document.getElementById("message");


/* ======================================
   KHỞI ĐỘNG
====================================== */

async function init() {

  if (!studentId) {
    alert("Thiếu ID học viên.");
    window.location.href = "./students.html";
    return;
  }

  const {
    data: { session }
  } =
    await supabaseClient.auth.getSession();

  if (!session) {
    window.location.href = "./login.html";
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
      .eq("id", session.user.id)
      .single();

  if (
    profileError ||
    !profile ||
    profile.role !== "admin"
  ) {
    window.location.href = "./login.html";
    return;
  }

  await loadPackages();
  await loadAreas();
  await loadStudent();
}


/* ======================================
   LOAD GÓI HỌC THẬT
====================================== */

async function loadPackages() {

  packageSelect.disabled = true;

  packageSelect.innerHTML =
    `<option value="">Đang tải gói học...</option>`;

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
        price,
        status
      `)
      .eq("status", "Hoạt động")
      .order("id", { ascending: true });

  if (error) {

    console.error(
      "Lỗi tải gói học:",
      error
    );

    packageSelect.innerHTML =
      `<option value="">Không tải được gói học</option>`;

    return;
  }

  packageSelect.innerHTML =
    `<option value="">-- Chọn gói học --</option>`;

  data.forEach(pkg => {

    const option =
      document.createElement("option");

    /*
      value = ID thật của packages
    */
    option.value = pkg.id;

    /*
      Giữ tên gói để lưu package_name
      tương thích dữ liệu cũ
    */
    option.dataset.packageName =
      pkg.package_name;

    let label =
      pkg.package_name;

    if (pkg.total_sessions) {
      label += ` · ${pkg.total_sessions} buổi`;
    }

    if (pkg.price !== null) {

      label +=
        ` · ${Number(pkg.price)
          .toLocaleString("vi-VN")}đ`;
    }

    option.textContent = label;

    packageSelect.appendChild(option);
  });

  packageSelect.disabled = false;
}


/* ======================================
   LOAD 34 TỈNH / THÀNH
====================================== */

async function loadAreas() {

  preferredAreaSelect.disabled = true;

  preferredAreaSelect.innerHTML =
    `<option value="">Đang tải Tỉnh/Thành...</option>`;

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
      `<option value="">Không tải được Tỉnh/Thành</option>`;

    return;
  }

  preferredAreaSelect.innerHTML =
    `<option value="">Chọn Tỉnh/Thành</option>`;

  data.forEach(area => {

    const option =
      document.createElement("option");

    option.value =
      area.tinh_thanh;

    option.textContent =
      area.tinh_thanh;

    option.dataset.maKhuVuc =
      area.ma_khu_vuc;

    preferredAreaSelect.appendChild(
      option
    );
  });

  preferredAreaSelect.disabled = false;
}


/* ======================================
   LOAD XÃ / PHƯỜNG
====================================== */

async function loadWards(
  maKhuVuc,
  selectedWard = ""
) {

  preferredWardSelect.disabled = true;

  preferredWardSelect.innerHTML =
    `<option value="">Đang tải Xã/Phường...</option>`;

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
      `<option value="">Không tải được Xã/Phường</option>`;

    return;
  }

  preferredWardSelect.innerHTML =
    `<option value="">Chọn Xã/Phường</option>`;

  data.forEach(ward => {

    const option =
      document.createElement("option");

    option.value =
      ward.ten_xa_phuong;

    option.textContent =
      ward.ten_xa_phuong;

    preferredWardSelect.appendChild(
      option
    );
  });

  preferredWardSelect.disabled = false;

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

  coachSelect.disabled = true;

  coachSelect.innerHTML =
    `<option value="">Đang tải Coach...</option>`;

  /*
    Chưa chọn tỉnh
    → chưa lọc Coach
  */
  if (!area) {

    coachSelect.innerHTML =
      `<option value="">Chưa phân Coach</option>`;

    coachSelect.disabled = false;

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
      `<option value="">Không tải được Coach</option>`;

    return;
  }

  /*
    Coach cùng Xã/Phường
    được ưu tiên lên đầu.
  */

  const coaches =
    [...(data || [])]
      .sort((a, b) => {

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
          return bSameWard - aSameWard;
        }

        return (
          a.full_name || ""
        ).localeCompare(
          b.full_name || "",
          "vi"
        );
      });


  coachSelect.innerHTML =
    `<option value="">Chưa phân Coach</option>`;


  coaches.forEach(coach => {

    const option =
      document.createElement("option");

    option.value =
      coach.id;

    let label =
      `${coach.coach_code || ""} - ${coach.full_name || ""}`;

    if (
      ward &&
      coach.preferred_ward === ward
    ) {
      label += " · Cùng Xã/Phường";
    }
    else if (
      coach.preferred_ward
    ) {
      label +=
        ` · ${coach.preferred_ward}`;
    }

    option.textContent = label;

    coachSelect.appendChild(
      option
    );
  });


  coachSelect.disabled = false;
}


/* ======================================
   KHI ĐỔI TỈNH
====================================== */

preferredAreaSelect.addEventListener(
  "change",
  async () => {

    preferredWardSelect.disabled = true;

    preferredWardSelect.innerHTML =
      `<option value="">Chọn Tỉnh/Thành trước</option>`;

    const selectedOption =
      preferredAreaSelect.options[
        preferredAreaSelect.selectedIndex
      ];

    const maKhuVuc =
      selectedOption?.dataset
        ?.maKhuVuc;

    if (!maKhuVuc) {

      await loadCoaches("", "");

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

preferredWardSelect.addEventListener(
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

  currentStudent = data;


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
    `./student-detail.html?id=${encodeURIComponent(studentId)}`;


  /*
    Tự lấy khu vực từ hồ sơ HV
  */

  preferredAreaSelect.value =
    data.preferred_area || "";


  if (data.preferred_area) {

    const selectedOption =
      preferredAreaSelect.options[
        preferredAreaSelect.selectedIndex
      ];

    const maKhuVuc =
      selectedOption?.dataset
        ?.maKhuVuc;

    if (maKhuVuc) {

      await loadWards(
        maKhuVuc,
        data.preferred_ward || ""
      );
    }
  }


  /*
    Tải Coach theo địa phương
    của học viên.
  */

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


      message.textContent = "";
      message.className = "message";


      const packageId =
        packageSelect.value;


      const selectedPackage =
        packageSelect.options[
          packageSelect.selectedIndex
        ];


      const packageName =
        selectedPackage?.dataset
          ?.packageName || "";


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


      if (!packageId) {

        message.textContent =
          "Hãy chọn gói học.";

        message.className =
          "message error";

        return;
      }


      saveBtn.disabled = true;

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
              Number(packageId),

            /*
              Vẫn lưu package_name
              để tương thích dữ liệu cũ
            */
            package_name:
              packageName,

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
          .select(
            "id, registration_code"
          )
          .single();


      if (error) {

        console.error(error);

        message.textContent =
          "Không tạo được đăng ký: " +
          error.message;

        message.className =
          "message error";

        saveBtn.disabled = false;

        saveBtn.textContent =
          "TẠO ĐĂNG KÝ HỌC";

        return;
      }


      message.textContent =
        "Đã tạo đăng ký " +
        data.registration_code;

      message.className =
        "message success";


      setTimeout(
        () => {

          window.location.href =
            `./student-detail.html?id=${encodeURIComponent(studentId)}`;

        },
        700
      );
    }
  );


init();
