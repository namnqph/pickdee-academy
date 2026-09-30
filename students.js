const config = window.PICKDEE_CONFIG;

const supabaseClient = supabase.createClient(
  config.SUPABASE_URL,
  config.SUPABASE_PUBLISHABLE_KEY
);

let allStudents = [];

async function init() {

  const { data: sessionData } =
    await supabaseClient.auth.getSession();

  const session = sessionData.session;

  if (!session) {
    window.location.href = "/login.html";
    return;
  }

  const { data: profile, error: profileError } =
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
    window.location.href = "/login.html";
    return;
  }

  await loadStudents();
}

async function loadStudents() {

  const { data, error } =
    await supabaseClient
      .from("students")
      .select(`
        id,
        student_code,
        full_name,
        phone,
        email,
        preferred_area,
        preferred_ward,
        status
      `)
      .eq("is_test", false)
      .order("created_at", {
        ascending: false
      });

  if (error) {

    console.error(error);

    document.getElementById("message").textContent =
      "Không tải được danh sách học viên.";

    return;
  }

  allStudents = data || [];

  renderStudents(allStudents);
}

function renderStudents(list) {

  const tbody =
    document.getElementById("studentRows");

  const empty =
    document.getElementById("empty");

  tbody.innerHTML = "";

  if (!list.length) {
    empty.style.display = "block";
    return;
  }

  empty.style.display = "none";

  list.forEach(student => {

    const row =
      document.createElement("tr");

    row.innerHTML = `
      <td>${student.student_code || "—"}</td>
      <td>${student.full_name || "—"}</td>
      <td>${student.phone || "—"}</td>
      <td>${student.email || "—"}</td>
      <td>${student.preferred_area || "—"}</td>
      <td>${student.preferred_ward || "—"}</td>
      <td>${student.status || "—"}</td>
    `;

    row.style.cursor = "pointer";

    row.title =
      "Bấm để xem hồ sơ học viên";

    row.addEventListener("click", () => {
      window.location.href =
        `./student-detail.html?id=${encodeURIComponent(student.id)}`;
    });

    tbody.appendChild(row);
  });
}
document
  .getElementById("search")
  .addEventListener("input", event => {

    const keyword =
      event.target.value
        .trim()
        .toLowerCase();

    if (!keyword) {
      renderStudents(allStudents);
      return;
    }

    const filtered =
      allStudents.filter(s =>
        [
          s.student_code,
          s.full_name,
          s.phone,
          s.email,
          s.preferred_area,
          s.preferred_ward
        ]
        .some(value =>
          String(value || "")
            .toLowerCase()
            .includes(keyword)
        )
      );

    renderStudents(filtered);
  });

init();
