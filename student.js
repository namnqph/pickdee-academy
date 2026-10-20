const config =
  window.PICKDEE_CONFIG || {};


const supabaseClient =
  window.supabase.createClient(
    config.SUPABASE_URL,
    config.SUPABASE_PUBLISHABLE_KEY
  );


const message =
  document.getElementById(
    "message"
  );


const logoutBtn =
  document.getElementById(
    "logoutBtn"
  );


let currentSession =
  null;


let currentStudent =
  null;


let locationAreas =
  [];


/* =====================================================
   HELPERS
===================================================== */

function show(
  id,
  value
) {

  const el =
    document.getElementById(
      id
    );


  if (!el) {
    return;
  }


  el.textContent =
    (
      value !== null
      &&
      value !== undefined
      &&
      String(value).trim() !== ""
    )
      ?
      value
      :
      "—";

}


function normalizeRole(
  value
) {

  return String(
    value || ""
  )
    .trim()
    .toLocaleLowerCase(
      "vi-VN"
    );

}


function createOption(
  value,
  label
) {

  const option =
    document.createElement(
      "option"
    );


  option.value =
    value;


  option.textContent =
    label;


  return option;

}


/* =====================================================
   KIỂM TRA ĐĂNG NHẬP + ROLE
===================================================== */

async function checkStudentLogin() {

  const {
    data: {
      session
    },
    error:
      sessionError
  } =
    await supabaseClient
      .auth
      .getSession();


  if (
    sessionError
    ||
    !session
  ) {

    window.location.replace(
      "/academy"
    );


    return null;

  }


  const {
    data: profile,
    error:
      profileError
  } =
    await supabaseClient
      .from(
        "profiles"
      )
      .select(
        "role"
      )
      .eq(
        "id",
        session.user.id
      )
      .maybeSingle();


  if (
    profileError
    ||
    !profile
  ) {

    window.location.replace(
      "/academy"
    );


    return null;

  }


  const role =
    normalizeRole(
      profile.role
    );


  /*
    ADMIN → về Admin
  */

  if (
    role === "admin"
  ) {

    window.location.replace(
      "/admin"
    );


    return null;

  }


  /*
    COACH → về Coach
  */

  if (
    role === "coach"
  ) {

    window.location.replace(
      "/coach"
    );


    return null;

  }


  /*
    Chỉ Học viên mới được ở lại.
  */

  if (
    role !== "student"
    &&
    role !== "hocvien"
    &&
    role !== "học viên"
  ) {

    window.location.replace(
      "/academy"
    );


    return null;

  }


  currentSession =
    session;


  show(
    "userEmail",
    session.user.email
  );


  return session;

}


/* =====================================================
   RENDER HỒ SƠ
===================================================== */

function renderStudentProfile() {

  if (
    !currentStudent
  ) {

    return;

  }


  show(
    "studentName",
    currentStudent.full_name
  );


  show(
    "studentCode",
    currentStudent.student_code
  );


  show(
    "phone",
    currentStudent.phone
  );


  show(
    "email",
    currentStudent.email
  );


  show(
    "gender",
    currentStudent.gender
  );


  show(
    "area",
    currentStudent.preferred_area
  );


  show(
    "ward",
    currentStudent.preferred_ward
  );


  show(
    "status",
    currentStudent.status
  );

}


/* =====================================================
   LOAD HỒ SƠ
===================================================== */

async function loadStudent(
  email
) {

  const {
    data,
    error
  } =
    await supabaseClient
      .from(
        "students"
      )
      .select(`
        id,
        student_code,
        full_name,
        phone,
        email,
        gender,
        preferred_area,
        preferred_ward,
        status
      `)
      .eq(
        "email",
        email
      )
      .maybeSingle();


  if (
    error
  ) {

    console.error(
      "LOAD STUDENT:",
      error
    );


    message.textContent =
      "Không tải được hồ sơ học viên: "
      +
      error.message;


    return false;

  }


  if (
    !data
  ) {

    message.textContent =
      "Tài khoản này chưa được liên kết với hồ sơ học viên.";


    return false;

  }


  currentStudent =
    data;


  renderStudentProfile();


  return true;

}


/* =====================================================
   LOAD DANH MỤC TỈNH / THÀNH
===================================================== */

async function loadAreaCatalog(
  areaSelect
) {

  areaSelect.disabled =
    true;


  areaSelect.innerHTML =
    "";


  areaSelect.appendChild(
    createOption(
      "",
      "Đang tải Tỉnh / Thành..."
    )
  );


  const {
    data,
    error
  } =
    await supabaseClient
      .from(
        "dm_khu_vuc"
      )
      .select(`
        ma_khu_vuc,
        tinh_thanh
      `)
      .eq(
        "dang_hoat_dong",
        true
      )
      .order(
        "tinh_thanh",
        {
          ascending:
            true
        }
      );


  if (
    error
  ) {

    console.error(
      "LOAD AREA CATALOG:",
      error
    );


    areaSelect.innerHTML =
      "";


    areaSelect.appendChild(
      createOption(
        "",
        "Không tải được Tỉnh / Thành"
      )
    );


    throw error;

  }


  locationAreas =
    data || [];


  areaSelect.innerHTML =
    "";


  areaSelect.appendChild(
    createOption(
      "",
      "Chọn Tỉnh / Thành"
    )
  );


  locationAreas.forEach(
    function (
      item
    ) {

      areaSelect.appendChild(
        createOption(
          item.tinh_thanh,
          item.tinh_thanh
        )
      );

    }
  );


  areaSelect.disabled =
    false;

}


/* =====================================================
   LẤY MÃ KHU VỰC TỪ TÊN TỈNH
===================================================== */

function getAreaCode(
  areaName
) {

  const area =
    locationAreas.find(
      function (
        item
      ) {

        return (
          String(
            item.tinh_thanh || ""
          )
            .trim()
          ===
          String(
            areaName || ""
          )
            .trim()
        );

      }
    );


  return (
    area?.ma_khu_vuc
    ||
    ""
  );

}


/* =====================================================
   LOAD XÃ / PHƯỜNG THEO TỈNH
===================================================== */

async function loadWardCatalog(
  areaName,
  wardSelect,
  selectedWard = ""
) {

  wardSelect.disabled =
    true;


  wardSelect.innerHTML =
    "";


  if (
    !areaName
  ) {

    wardSelect.appendChild(
      createOption(
        "",
        "Chọn Tỉnh / Thành trước"
      )
    );


    return;

  }


  const areaCode =
    getAreaCode(
      areaName
    );


  if (
    !areaCode
  ) {

    wardSelect.appendChild(
      createOption(
        "",
        "Không xác định được khu vực"
      )
    );


    return;

  }


  wardSelect.appendChild(
    createOption(
      "",
      "Đang tải Xã / Phường..."
    )
  );


  const {
    data,
    error
  } =
    await supabaseClient
      .from(
        "dm_xa_phuong"
      )
      .select(`
        ma_xa_phuong,
        ma_khu_vuc,
        ten_xa_phuong
      `)
      .eq(
        "dang_hoat_dong",
        true
      )
      .eq(
        "ma_khu_vuc",
        areaCode
      )
      .order(
        "ten_xa_phuong",
        {
          ascending:
            true
        }
      );


  if (
    error
  ) {

    console.error(
      "LOAD WARD CATALOG:",
      error
    );


    wardSelect.innerHTML =
      "";


    wardSelect.appendChild(
      createOption(
        "",
        "Không tải được Xã / Phường"
      )
    );


    throw error;

  }


  wardSelect.innerHTML =
    "";


  wardSelect.appendChild(
    createOption(
      "",
      "Chọn Xã / Phường"
    )
  );


  (
    data || []
  )
    .forEach(
      function (
        item
      ) {

        wardSelect.appendChild(
          createOption(
            item.ten_xa_phuong,
            item.ten_xa_phuong
          )
        );

      }
    );


  wardSelect.disabled =
    false;


  if (
    selectedWard
  ) {

    const exists =
      Array.from(
        wardSelect.options
      )
        .some(
          function (
            option
          ) {

            return (
              option.value
              ===
              selectedWard
            );

          }
        );


    if (
      exists
    ) {

      wardSelect.value =
        selectedWard;

    }

  }

}


/* =====================================================
   TẠO GIAO DIỆN SỬA HỒ SƠ
===================================================== */

function buildStudentProfileEditor() {

  const profileCard =
    document.querySelector(
      ".profile-card"
    );


  const profileMain =
    profileCard
      ?.querySelector(
        ".profile-main"
      );


  const title =
    profileCard
      ?.querySelector(
        "h2"
      );


  if (
    !profileCard
    ||
    !profileMain
    ||
    !title
    ||
    document.getElementById(
      "editStudentProfileBtn"
    )
  ) {

    return;

  }


  /* ===================================================
     CSS
  ==================================================== */

  const style =
    document.createElement(
      "style"
    );


  style.textContent = `

    .student-profile-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 18px;
      flex-wrap: wrap;
    }


    .student-profile-head h2 {
      margin: 0 !important;
    }


    .student-profile-edit-btn {
      min-height: 40px;
      padding: 0 14px;

      border: 0;
      border-radius: 10px;

      background: #ffc934;
      color: #172600;

      font-family: inherit;
      font-size: 12px;
      font-weight: 900;

      cursor: pointer;
    }


    .student-profile-edit-form {
      display: none;
      padding-top: 4px;
    }


    .student-profile-edit-grid {
      display: grid;
      grid-template-columns:
        1fr 1fr;

      gap: 15px;
    }


    .student-profile-field {
      display: grid;
      gap: 7px;
    }


    .student-profile-field.full {
      grid-column:
        1 / -1;
    }


    .student-profile-field label {
      color:
        rgba(255,255,255,.55);

      font-size: 12px;
      font-weight: 800;
    }


    .student-profile-field input,
    .student-profile-field select {
      width: 100%;
      min-height: 46px;

      padding:
        0 12px;

      border:
        1px solid rgba(255,255,255,.17);

      border-radius: 10px;

      outline: none;

      background: #202020;
      color: #ffffff;

      font-family: inherit;
      font-size: 14px;
    }


    .student-profile-field input:focus,
    .student-profile-field select:focus {
      border-color:
        rgba(255,201,52,.65);
    }


    .student-profile-field select:disabled {
      opacity: .55;
      cursor: not-allowed;
    }


    .student-profile-readonly {
      opacity: .6;
      cursor: not-allowed;
    }


    .student-profile-actions {
      display: flex;
      gap: 10px;

      margin-top: 18px;
    }


    .student-profile-actions button {
      flex: 1;

      min-height: 46px;

      border-radius: 10px;

      font-family: inherit;
      font-size: 12px;
      font-weight: 900;

      cursor: pointer;
    }


    #cancelStudentProfileBtn {
      border:
        1px solid rgba(255,255,255,.16);

      background:
        rgba(255,255,255,.07);

      color: #ffffff;
    }


    #saveStudentProfileBtn {
      border: 0;

      background: #ffc934;
      color: #172600;
    }


    #studentProfileEditMessage {
      min-height: 20px;

      margin-top: 12px;

      color: #ffc934;

      font-size: 12px;
      font-weight: 700;
    }


    @media(max-width:700px) {

      .student-profile-edit-grid {
        grid-template-columns: 1fr;
      }


      .student-profile-field.full {
        grid-column: auto;
      }

    }

  `;


  document.head.appendChild(
    style
  );


  /* ===================================================
     HEADER CARD
  ==================================================== */

  const header =
    document.createElement(
      "div"
    );


  header.className =
    "student-profile-head";


  title.parentNode.insertBefore(
    header,
    title
  );


  header.appendChild(
    title
  );


  const editBtn =
    document.createElement(
      "button"
    );


  editBtn.id =
    "editStudentProfileBtn";


  editBtn.type =
    "button";


  editBtn.className =
    "student-profile-edit-btn";


  editBtn.textContent =
    "✏️ SỬA HỒ SƠ";


  header.appendChild(
    editBtn
  );


  /* ===================================================
     FORM
  ==================================================== */

  const form =
    document.createElement(
      "form"
    );


  form.id =
    "studentProfileEditForm";


  form.className =
    "student-profile-edit-form";


  form.innerHTML = `

    <div class="student-profile-edit-grid">

      <div class="student-profile-field full">

        <label>
          Họ và tên *
        </label>

        <input
          id="studentEditFullName"
          type="text"
          maxlength="120"
          required
        >

      </div>


      <div class="student-profile-field">

        <label>
          Số điện thoại
        </label>

        <input
          id="studentEditPhone"
          type="tel"
          maxlength="30"
        >

      </div>


      <div class="student-profile-field">

        <label>
          Giới tính
        </label>

        <select id="studentEditGender">

          <option value="">
            Chưa chọn
          </option>

          <option value="Nam">
            Nam
          </option>

          <option value="Nữ">
            Nữ
          </option>

          <option value="Khác">
            Khác
          </option>

        </select>

      </div>


      <div class="student-profile-field">

        <label>
          Khu vực muốn học
        </label>

        <select
          id="studentEditArea"
        >

          <option value="">
            Đang tải Tỉnh / Thành...
          </option>

        </select>

      </div>


      <div class="student-profile-field">

        <label>
          Xã / Phường muốn học
        </label>

        <select
          id="studentEditWard"
          disabled
        >

          <option value="">
            Chọn Tỉnh / Thành trước
          </option>

        </select>

      </div>


      <div class="student-profile-field full">

        <label>
          Email đăng nhập
        </label>

        <input
          id="studentEditEmail"
          class="student-profile-readonly"
          type="email"
          readonly
        >

      </div>

    </div>


    <div class="student-profile-actions">

      <button
        id="cancelStudentProfileBtn"
        type="button"
      >
        HỦY
      </button>


      <button
        id="saveStudentProfileBtn"
        type="submit"
      >
        LƯU HỒ SƠ
      </button>

    </div>


    <div
      id="studentProfileEditMessage"
    ></div>

  `;


  header.insertAdjacentElement(
    "afterend",
    form
  );


  const fullNameInput =
    document.getElementById(
      "studentEditFullName"
    );


  const phoneInput =
    document.getElementById(
      "studentEditPhone"
    );


  const genderInput =
    document.getElementById(
      "studentEditGender"
    );


  const areaSelect =
    document.getElementById(
      "studentEditArea"
    );


  const wardSelect =
    document.getElementById(
      "studentEditWard"
    );


  const emailInput =
    document.getElementById(
      "studentEditEmail"
    );


  const cancelBtn =
    document.getElementById(
      "cancelStudentProfileBtn"
    );


  const saveBtn =
    document.getElementById(
      "saveStudentProfileBtn"
    );


  const formMessage =
    document.getElementById(
      "studentProfileEditMessage"
    );


  /* ===================================================
     MỞ FORM
  ==================================================== */

  async function openEditor() {

    if (
      !currentStudent
    ) {

      return;

    }


    formMessage.style.color =
      "#ffc934";


    formMessage.textContent =
      "Đang tải danh mục khu vực...";


    profileMain.style.display =
      "none";


    form.style.display =
      "block";


    editBtn.style.display =
      "none";


    fullNameInput.value =
      currentStudent.full_name
      ||
      "";


    phoneInput.value =
      currentStudent.phone
      ||
      "";


    genderInput.value =
      [
        "Nam",
        "Nữ",
        "Khác"
      ]
        .includes(
          currentStudent.gender
        )
        ?
        currentStudent.gender
        :
        "";


    emailInput.value =
      currentStudent.email
      ||
      currentSession
        ?.user
        ?.email
      ||
      "";


    try {

      await loadAreaCatalog(
        areaSelect
      );


      if (
        currentStudent.preferred_area
      ) {

        const areaExists =
          Array.from(
            areaSelect.options
          )
            .some(
              function (
                option
              ) {

                return (
                  option.value
                  ===
                  currentStudent.preferred_area
                );

              }
            );


        if (
          areaExists
        ) {

          areaSelect.value =
            currentStudent.preferred_area;

        }

      }


      await loadWardCatalog(
        areaSelect.value,
        wardSelect,
        currentStudent.preferred_ward
        ||
        ""
      );


      formMessage.textContent =
        "";


      fullNameInput.focus();

    }
    catch (
      error
    ) {

      console.error(
        "OPEN STUDENT PROFILE:",
        error
      );


      formMessage.style.color =
        "#ffaaaa";


      formMessage.textContent =
        "Không tải được danh mục khu vực.";

    }

  }


  /* ===================================================
     ĐÓNG FORM
  ==================================================== */

  function closeEditor() {

    form.style.display =
      "none";


    profileMain.style.display =
      "";


    editBtn.style.display =
      "";


    formMessage.textContent =
      "";

  }


  editBtn.addEventListener(
    "click",
    openEditor
  );


  cancelBtn.addEventListener(
    "click",
    closeEditor
  );


  /* ===================================================
     ĐỔI TỈNH → LOAD XÃ / PHƯỜNG
  ==================================================== */

  areaSelect.addEventListener(
    "change",
    async function () {

      formMessage.style.color =
        "#ffc934";


      formMessage.textContent =
        areaSelect.value
          ?
          "Đang tải Xã / Phường..."
          :
          "";


      try {

        await loadWardCatalog(
          areaSelect.value,
          wardSelect,
          ""
        );


        formMessage.textContent =
          "";

      }
      catch (
        error
      ) {

        console.error(
          "AREA CHANGE:",
          error
        );


        formMessage.style.color =
          "#ffaaaa";


        formMessage.textContent =
          "Không tải được danh sách Xã / Phường.";

      }

    }
  );


  /* ===================================================
     LƯU HỒ SƠ QUA RPC
  ==================================================== */

  form.addEventListener(
    "submit",
    async function (
      event
    ) {

      event.preventDefault();


      if (
        !currentStudent
        ||
        !currentSession
      ) {

        formMessage.style.color =
          "#ffaaaa";


        formMessage.textContent =
          "Không xác định được hồ sơ Học viên.";


        return;

      }


      const fullName =
        fullNameInput
          .value
          .trim();


      const phone =
        phoneInput
          .value
          .trim();


      const gender =
        genderInput
          .value
          .trim();


      const area =
        areaSelect
          .value
          .trim();


      const ward =
        wardSelect
          .value
          .trim();


      if (
        !fullName
      ) {

        formMessage.style.color =
          "#ffaaaa";


        formMessage.textContent =
          "Vui lòng nhập họ và tên.";


        fullNameInput.focus();


        return;

      }


      if (
        ward
        &&
        !area
      ) {

        formMessage.style.color =
          "#ffaaaa";


        formMessage.textContent =
          "Vui lòng chọn Tỉnh / Thành trước.";


        return;

      }


      saveBtn.disabled =
        true;


      cancelBtn.disabled =
        true;


      areaSelect.disabled =
        true;


      wardSelect.disabled =
        true;


      saveBtn.textContent =
        "ĐANG LƯU...";


      formMessage.style.color =
        "#ffc934";


      formMessage.textContent =
        "Đang cập nhật hồ sơ...";


      try {

        const {
          data:
            updated,
          error:
            updateError
        } =
          await supabaseClient
            .rpc(
              "update_my_student_profile",
              {

                p_full_name:
                  fullName,

                p_phone:
                  phone
                  ||
                  null,

                p_gender:
                  gender
                  ||
                  null,

                p_preferred_area:
                  area
                  ||
                  null,

                p_preferred_ward:
                  ward
                  ||
                  null

              }
            );


        if (
          updateError
        ) {

          throw updateError;

        }


        if (
          !updated
        ) {

          throw new Error(
            "Không nhận được hồ sơ sau khi cập nhật."
          );

        }


        currentStudent = {

          ...currentStudent,

          ...updated

        };


        renderStudentProfile();


        formMessage.style.color =
          "#ffc934";


        formMessage.textContent =
          "✓ Đã cập nhật hồ sơ.";


        setTimeout(
          function () {

            closeEditor();

          },
          700
        );

      }
      catch (
        error
      ) {

        console.error(
          "UPDATE STUDENT PROFILE:",
          error
        );


        formMessage.style.color =
          "#ffaaaa";


        formMessage.textContent =
          "Không cập nhật được hồ sơ: "
          +
          (
            error?.message
            ||
            error
          );

      }
      finally {

        saveBtn.disabled =
          false;


        cancelBtn.disabled =
          false;


        areaSelect.disabled =
          false;


        wardSelect.disabled =
          !areaSelect.value;


        saveBtn.textContent =
          "LƯU HỒ SƠ";

      }

    }
  );

}


/* =====================================================
   ĐĂNG XUẤT
===================================================== */

logoutBtn.addEventListener(
  "click",
  async function () {

    logoutBtn.disabled =
      true;


    logoutBtn.textContent =
      "ĐANG ĐĂNG XUẤT...";


    await supabaseClient
      .auth
      .signOut();


    window.location.replace(
      "/?v="
      +
      Date.now()
    );

  }
);


/* =====================================================
   START
===================================================== */

async function init() {

  try {

    const session =
      await checkStudentLogin();


    if (
      !session
    ) {

      return;

    }


    const loaded =
      await loadStudent(
        session.user.email
      );


    if (
      !loaded
    ) {

      return;

    }


    buildStudentProfileEditor();

  }
  catch (
    error
  ) {

    console.error(
      "STUDENT INIT:",
      error
    );


    message.textContent =
      "Có lỗi khi tải khu vực học viên: "
      +
      (
        error?.message
        ||
        error
      );

  }

}


init();
