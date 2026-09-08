const config =
  window.PICKDEE_CONFIG || {};

const supabaseClient =
  window.supabase.createClient(
    config.SUPABASE_URL,
    config.SUPABASE_PUBLISHABLE_KEY
  );

let allCoaches = [];


async function init() {

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
    window.location.href =
      "./login.html";
    return;
  }

  await loadCoaches();
}


async function loadCoaches() {

  const { data, error } =
    await supabaseClient
      .from("coaches")
      .select(`
        id,
        coach_code,
        full_name,
        phone,
        email,
        preferred_area,
        preferred_ward,
        status
      `)
      .order("created_at", {
        ascending: false
      });

  if (error) {

    console.error(error);

    document.getElementById(
      "message"
    ).textContent =
      "Không tải được danh sách Coach.";

    return;
  }

  allCoaches = data || [];

  renderCoaches(allCoaches);
}


function renderCoaches(list) {

  const tbody =
    document.getElementById(
      "coachRows"
    );

  const empty =
    document.getElementById(
      "empty"
    );

  tbody.innerHTML = "";

  if (!list.length) {
    empty.style.display = "block";
    return;
  }

  empty.style.display = "none";

  list.forEach(coach => {

    const row =
      document.createElement("tr");

    row.style.cursor =
      "pointer";

    row.innerHTML = `
      <td>${coach.coach_code || "—"}</td>
      <td>${coach.full_name || "—"}</td>
      <td>${coach.phone || "—"}</td>
      <td>${coach.email || "—"}</td>
      <td>${coach.preferred_area || "—"}</td>
      <td>${coach.preferred_ward || "—"}</td>
      <td>
        <span class="badge">
          ${coach.status || "—"}
        </span>
      </td>
    `;

    row.addEventListener(
      "click",
      () => {

        window.location.href =
          `./coach-detail.html?id=${encodeURIComponent(coach.id)}`;

      }
    );

    tbody.appendChild(row);
  });
}


document
  .getElementById("search")
  .addEventListener(
    "input",
    event => {

      const keyword =
        event.target.value
          .trim()
          .toLowerCase();

      if (!keyword) {
        renderCoaches(allCoaches);
        return;
      }

      const filtered =
        allCoaches.filter(c =>
          [
            c.coach_code,
            c.full_name,
            c.phone,
            c.email,
            c.preferred_area,
            c.preferred_ward
          ]
            .some(value =>
              String(value || "")
                .toLowerCase()
                .includes(keyword)
            )
        );

      renderCoaches(filtered);
    }
  );


init();
