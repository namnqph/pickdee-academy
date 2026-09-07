const config = window.PICKDEE_CONFIG;

const supabaseClient = supabase.createClient(
  config.SUPABASE_URL,
  config.SUPABASE_PUBLISHABLE_KEY
);

const form = document.getElementById("studentForm");
const message = document.getElementById("message");

async function checkAdmin() {

  const { data } =
    await supabaseClient.auth.getSession();

  if (!data.session) {
    window.location.href = "/login.html";
    return false;
  }

  const { data: profile } =
    await supabaseClient
      .from("profiles")
      .select("role")
      .eq("id", data.session.user.id)
      .single();

  if (!profile || profile.role !== "admin") {
    window.location.href = "/login.html";
    return false;
  }

  return true;
}

form.addEventListener("submit", async event => {

  event.preventDefault();

  message.style.color = "#b9ff18";
  message.textContent = "Đang lưu...";

  const student = {
    full_name:
      document.getElementById("full_name").value.trim(),

    phone:
      document.getElementById("phone").value.trim() || null,

    email:
      document.getElementById("email").value.trim() || null,

    birth_date:
      document.getElementById("birth_date").value || null,

    gender:
      document.getElementById("gender").value || null,

    preferred_area:
      document.getElementById("preferred_area").value.trim() || null,

    preferred_ward:
      document.getElementById("preferred_ward").value.trim() || null,

    address:
      document.getElementById("address").value.trim() || null,

    note:
      document.getElementById("note").value.trim() || null,

    joined_date:
      new Date().toISOString().slice(0,10)
  };

  const { error } =
    await supabaseClient
      .from("students")
      .insert(student);

  if (error) {
    console.error(error);

    message.style.color = "#ffb4b4";
    message.textContent =
      "Không lưu được học viên: " + error.message;

    return;
  }

  message.textContent = "Đã tạo học viên thành công.";

  setTimeout(() => {
    window.location.href = "/students.html";
  }, 700);
});

checkAdmin();
