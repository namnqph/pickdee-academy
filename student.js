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


  if (
    !el
  ) {

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
    value
    ||
    ""
  )
    .trim()
    .toLocaleLowerCase(
      "vi-VN"
    );

}


/* =====================================================
   KIỂM TRA ĐĂNG NHẬP + ĐÚNG ROLE
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
    Admin không được đứng trong Student.
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
    Coach không được đứng trong Student.
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
    Chỉ Student mới được ở lại.
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
   LOAD HỒ SƠ CỦA CHÍNH HỌC VIÊN
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


  /*
    CSS riêng phần sửa hồ sơ.
  */

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

      background: #d8ff45;
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
      grid-template-columns: 1fr 1fr;

      gap: 15px;
    }


    .student-profile-field {
      display: grid;
      gap: 7px;
    }


    .student-profile-field.full {
      grid-column: 1 / -1;
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

      padding: 0 12px;

      border:
        1px solid rgba(255,255,255,.17);

      border-radius: 10px;

      outline: none;

      background: #092653;
      color: #ffffff;

      font-family: inherit;
      font-size: 14px;
    }


    .student-profile-field input:focus,
    .student-profile-field select:focus {
      border-color:
        rgba(216,255,69,.65);
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

      background: #d8ff45;
      color: #172600;
    }


    #studentProfileEditMessage {
      min-height: 20px;

      margin-top: 12px;

      color: #d8ff45;

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


  /*
    Header của card.
  */

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


  /*
    Form sửa.
  */

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

        <input
          id="studentEditArea"
          type="text"
          maxlength="120"
        >

      </div>


      <div class="student-profile-field">

        <label>
          Xã / Phường muốn học
        </label>

        <input
          id="studentEditWard"
          type="text"
          maxlength="120"
        >

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


    <div id="studentProfileEditMessage"></div>

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


  const areaInput =
    document.getElementById(
      "studentEditArea"
    );


  const wardInput =
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


  function openEditor() {

    if (
      !currentStudent
    ) {

      return;

    }


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


    areaInput.value =
      currentStudent.preferred_area
      ||
      "";


    wardInput.value =
      currentStudent.preferred_ward
      ||
      "";


    emailInput.value =
      currentStudent.email
      ||
      currentSession?.user?.email
      ||
      "";


    formMessage.textContent =
      "";


    profileMain.style.display =
      "none";


    form.style.display =
      "block";


    editBtn.style.display =
      "none";


    fullNameInput.focus();

  }


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

        formMessage.textContent =
          "Không xác định được hồ sơ học viên.";


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
        areaInput
          .value
          .trim();


      const ward =
        wardInput
          .value
          .trim();


      if (
        !fullName
      ) {

        formMessage.textContent =
          "Vui lòng nhập họ và tên.";


        fullNameInput.focus();


        return;

      }


      saveBtn.disabled =
        true;


      cancelBtn.disabled =
        true;


      saveBtn.textContent =
        "ĐANG LƯU...";


      formMessage.style.color =
        "#d8ff45";


      formMessage.textContent =
        "Đang cập nhật hồ sơ...";


      try {

        /*
          Xác định lại chính Student đang đăng nhập.
          Không dùng ID do người dùng truyền lên.
        */

        const {
          data: studentId,
          error:
            studentIdError
        } =
          await supabaseClient
            .rpc(
              "current_student_id"
            );


        if (
          studentIdError
          ||
          !studentId
        ) {

          throw new Error(
            "Không xác định được hồ sơ học viên hiện tại."
          );

        }


        if (
          Number(
            studentId
          )
          !==
          Number(
            currentStudent.id
          )
        ) {

          throw new Error(
            "Hồ sơ học viên không khớp với tài khoản đăng nhập."
          );

        }


        /*
          Chỉ cho phép sửa đúng các trường cá nhân.
          KHÔNG sửa email, mã HV, trạng thái, gói học...
        */

        const {
          data:
            updatedRows,
          error:
            updateError
        } =
          await supabaseClient
            .from(
              "students"
            )
            .update(
              {
                full_name:
                  fullName,

                phone:
                  phone
                  ||
                  null,

                gender:
                  gender
                  ||
                  null,

                preferred_area:
                  area
                  ||
                  null,

                preferred_ward:
                  ward
                  ||
                  null
              }
            )
            .eq(
              "id",
              Number(
                studentId
              )
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
            `);


        if (
          updateError
        ) {

          throw updateError;

        }


        const updated =
          Array.isArray(
            updatedRows
          )
            ?
            updatedRows[0]
            :
            updatedRows;


        if (
          !updated
        ) {

          throw new Error(
            "Hệ thống chưa cho phép Học viên tự cập nhật hồ sơ."
          );

        }


        currentStudent =
          updated;


        renderStudentProfile();


        formMessage.style.color =
          "#d8ff45";


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
