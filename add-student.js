const config =
  window.PICKDEE_CONFIG || {};

const supabaseClient =
  supabase.createClient(
    config.SUPABASE_URL,
    config.SUPABASE_PUBLISHABLE_KEY
  );

const form =
  document.getElementById("studentForm");

const message =
  document.getElementById("message");

const preferredAreaSelect =
  document.getElementById("preferred_area");

const preferredWardSelect =
  document.getElementById("preferred_ward");


/* =====================================================
   LOAD 34 TỈNH / THÀNH
===================================================== */

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
      "Lỗi tải khu vực:",
      error
    );

    preferredAreaSelect.innerHTML =
      `<option value="">Không tải được Tỉnh/Thành</option>`;

    message.style.color =
      "#ffb4b4";

    message.textContent =
      "Không tải được danh sách Tỉnh/Thành.";

    return;
  }

  preferredAreaSelect.innerHTML =
    `<option value="">Chọn Tỉnh/Thành</option>`;

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

    preferredAreaSelect.appendChild(
      option
    );
  });

  preferredAreaSelect.disabled = false;
}


/* =====================================================
   LOAD XÃ / PHƯỜNG THEO TỈNH
===================================================== */

async function loadWards(
  maKhuVuc
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
      "Lỗi tải xã/phường:",
      error
    );

    preferredWardSelect.innerHTML =
      `<option value="">Không tải được Xã/Phường</option>`;

    message.style.color =
      "#ffb4b4";

    message.textContent =
      "Không tải được danh sách Xã/Phường.";

    return;
  }

  preferredWardSelect.innerHTML =
    `<option value="">Chọn Xã/Phường</option>`;

  data.forEach(ward => {

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

    preferredWardSelect.appendChild(
      option
    );
  });

  preferredWardSelect.disabled = false;
}


/* =====================================================
   KHI ĐỔI TỈNH / THÀNH
===================================================== */

preferredAreaSelect.addEventListener(
  "change",
  async () => {

    message.textContent = "";

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
      return;
    }

    await loadWards(
      maKhuVuc
    );
  }
);


/* =====================================================
   KIỂM TRA ADMIN
===================================================== */

async function checkAdmin() {

  const {
    data
  } =
    await supabaseClient.auth
      .getSession();

  if (!data.session) {

    window.location.href =
      "/login.html";

    return false;
  }

  const {
    data: profile
  } =
    await supabaseClient
      .from("profiles")
      .select("role")
      .eq(
        "id",
        data.session.user.id
      )
      .single();

  if (
    !profile ||
    profile.role !== "admin"
  ) {

    window.location.href =
      "/login.html";

    return false;
  }

  return true;
}


/* =====================================================
   LƯU HỌC VIÊN
===================================================== */

form.addEventListener(
  "submit",
  async event => {

    event.preventDefault();

    message.style.color =
      "#ffc118";

    message.textContent =
      "Đang lưu...";

    const student = {

      full_name:
        document
          .getElementById(
            "full_name"
          )
          .value
          .trim(),

      phone:
        document
          .getElementById(
            "phone"
          )
          .value
          .trim() || null,

      email:
        document
          .getElementById(
            "email"
          )
          .value
          .trim() || null,

      birth_date:
        document
          .getElementById(
            "birth_date"
          )
          .value || null,

      gender:
        document
          .getElementById(
            "gender"
          )
          .value || null,

      preferred_area:
        preferredAreaSelect
          .value
          .trim() || null,

      preferred_ward:
        preferredWardSelect
          .value
          .trim() || null,

      address:
        document
          .getElementById(
            "address"
          )
          .value
          .trim() || null,

      note:
        document
          .getElementById(
            "note"
          )
          .value
          .trim() || null,

      joined_date:
        new Date()
          .toISOString()
          .slice(0, 10)
    };


    if (!student.full_name) {

      message.style.color =
        "#ffb4b4";

      message.textContent =
        "Hãy nhập họ và tên học viên.";

      return;
    }


    const {
      error
    } =
      await supabaseClient
        .from("students")
        .insert(student);


    if (error) {

      console.error(error);

      message.style.color =
        "#ffb4b4";

      message.textContent =
        "Không lưu được học viên: " +
        error.message;

      return;
    }


    message.style.color =
      "#ffc118";

    message.textContent =
      "Đã tạo học viên thành công.";


    setTimeout(
      () => {

        window.location.href =
          "/students.html";

      },
      700
    );
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

  await loadAreas();
}

init();
