const config =
  window.PICKDEE_CONFIG || {};

const supabaseClient =
  window.supabase.createClient(
    config.SUPABASE_URL,
    config.SUPABASE_PUBLISHABLE_KEY
  );


const message =
  document.getElementById("message");

const logoutBtn =
  document.getElementById("logoutBtn");


function show(id, value) {

  const el =
    document.getElementById(id);

  if (!el) return;

  el.textContent =
    value || "—";
}


/* =====================================
   KIỂM TRA ĐĂNG NHẬP HỌC VIÊN
===================================== */

async function checkStudentLogin() {

  const {
    data: { session }
  } =
    await supabaseClient
      .auth
      .getSession();


  if (!session) {

    window.location.replace(
      "./login.html"
    );

    return null;
  }


  show(
    "userEmail",
    session.user.email
  );


  const {
    data: profile,
    error
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
    error ||
    !profile ||
    profile.role !== "student"
  ) {

    window.location.replace(
      "./login.html"
    );

    return null;
  }


  return session;
}


/* =====================================
   LOAD HỒ SƠ CỦA CHÍNH HỌC VIÊN
===================================== */

async function loadStudent(email) {

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


  if (error) {

    console.error(error);

    message.textContent =
      "Không tải được hồ sơ học viên: " +
      error.message;

    return false;
  }


  if (!data) {

    message.textContent =
      "Tài khoản này chưa được liên kết với hồ sơ học viên.";

    return false;
  }


  show(
    "studentName",
    data.full_name
  );

  show(
    "studentCode",
    data.student_code
  );

  show(
    "phone",
    data.phone
  );

  show(
    "email",
    data.email
  );

  show(
    "gender",
    data.gender
  );

  show(
    "area",
    data.preferred_area
  );

  show(
    "ward",
    data.preferred_ward
  );

  show(
    "status",
    data.status
  );


  return true;
}


/* =====================================
   ĐĂNG XUẤT
===================================== */

logoutBtn.addEventListener(
  "click",
  async () => {

    logoutBtn.disabled = true;

    logoutBtn.textContent =
      "ĐANG ĐĂNG XUẤT...";


    await supabaseClient
      .auth
      .signOut();


   window.location.replace(
  "/?v=" + Date.now()
);
  }
);


/* =====================================
   START
===================================== */

async function init() {

  try {

    const session =
      await checkStudentLogin();


    if (!session) {
      return;
    }


    await loadStudent(
      session.user.email
    );


  } catch (error) {

    console.error(error);

    message.textContent =
      "Có lỗi khi tải khu vực học viên: " +
      (error.message || error);
  }
}


init();
