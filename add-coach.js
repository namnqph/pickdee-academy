const config =
  window.PICKDEE_CONFIG || {};

const supabaseClient =
  window.supabase.createClient(
    config.SUPABASE_URL,
    config.SUPABASE_PUBLISHABLE_KEY
  );

const preferredAreaSelect =
  document.getElementById("preferredArea");

const preferredWardSelect =
  document.getElementById("preferredWard");

const message =
  document.getElementById("message");


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

    message.textContent =
      "Không tải được danh sách Tỉnh/Thành.";

    message.className =
      "message error";

    return;
  }

  preferredAreaSelect.innerHTML =
    `<option value="">Chọn Tỉnh/Thành</option>`;

  data.forEach(area => {

    const option =
      document.createElement(
        "option"
      );

    /*
      value lưu vào coaches.preferred_area
      Ví dụ: Bắc Ninh
    */
    option.value =
      area.tinh_thanh;

    option.textContent =
      area.tinh_thanh;

    /*
      Mã này chỉ dùng để lọc xã/phường
      Ví dụ: KV024
    */
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

    message.textContent =
      "Không tải được danh sách Xã/Phường.";

    message.className =
      "message error";

    return;
  }

  preferredWardSelect.innerHTML =
    `<option value="">Chọn Xã/Phường</option>`;

  data.forEach(ward => {

    const option =
      document.createElement(
        "option"
      );

    /*
      Lưu tên xã/phường vào
      coaches.preferred_ward
    */
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
    message.className = "message";

    /*
      Xóa xã/phường cũ mỗi khi đổi tỉnh
    */
    preferredWardSelect.innerHTML =
      `<option value="">Chọn Tỉnh/Thành trước</option>`;

    preferredWardSelect.disabled = true;

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
   KIỂM TRA ĐĂNG NHẬP + QUYỀN ADMIN
===================================================== */

async function init() {

  const {
    data: { session }
  } =
    await supabaseClient.auth
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

  /*
    Admin hợp lệ
    → tải 34 tỉnh/thành
  */
  await loadAreas();
}


/* =====================================================
   LƯU COACH
===================================================== */

document
  .getElementById("coachForm")
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

      const fullName =
        document.getElementById(
          "fullName"
        ).value.trim();

      const phone =
        document.getElementById(
          "phone"
        ).value.trim();

      const email =
        document.getElementById(
          "email"
        ).value.trim();

      const preferredArea =
        preferredAreaSelect
          .value
          .trim();

      const preferredWard =
        preferredWardSelect
          .value
          .trim();

      const status =
        document.getElementById(
          "status"
        ).value;

      const note =
        document.getElementById(
          "note"
        ).value.trim();


      /* =========================
         VALIDATION
      ========================= */

      if (!fullName) {

        message.textContent =
          "Hãy nhập họ và tên Coach.";

        message.className =
          "message error";

        return;
      }


      /*
        Khu vực có thể để trống,
        nhưng nếu đã chọn xã/phường
        thì tỉnh chắc chắn đã được chọn.
      */


      /* =========================
         INSERT DATABASE
      ========================= */

      saveBtn.disabled = true;

      saveBtn.textContent =
        "ĐANG LƯU...";

      const {
        data,
        error
      } =
        await supabaseClient
          .from("coaches")
          .insert({
            full_name:
              fullName,

            phone:
              phone || null,

            email:
              email || null,

            preferred_area:
              preferredArea || null,

            preferred_ward:
              preferredWard || null,

            status:
              status,

            note:
              note || null
          })
          .select(
            "id, coach_code, full_name"
          )
          .single();


      /* =========================
         ERROR
      ========================= */

      if (error) {

        console.error(
          error
        );

        message.textContent =
          "Không lưu được Coach: " +
          error.message;

        message.className =
          "message error";

        saveBtn.disabled = false;

        saveBtn.textContent =
          "LƯU COACH";

        return;
      }


      /* =========================
         SUCCESS
      ========================= */

      message.textContent =
        `Đã tạo ${data.coach_code} - ${data.full_name}`;

      message.className =
        "message success";

      setTimeout(
        () => {

          window.location.href =
            "./coaches.html";

        },
        700
      );
    }
  );


/* =====================================================
   START
===================================================== */

init();
