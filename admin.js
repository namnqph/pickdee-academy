const config = window.PICKDEE_CONFIG;

const supabaseClient = supabase.createClient(
  config.SUPABASE_URL,
  config.SUPABASE_PUBLISHABLE_KEY
);

async function startAdmin() {

  const { data: sessionData } =
    await supabaseClient.auth.getSession();

  const session = sessionData.session;

  if (!session) {
    window.location.href = "/login.html";
    return;
  }

  const user = session.user;

  const { data: profile, error } =
    await supabaseClient
      .from("profiles")
      .select("email, full_name, role")
      .eq("id", user.id)
      .single();

  if (error || !profile) {
    console.error(error);

    document.getElementById("loading").textContent =
      "Không đọc được hồ sơ Admin.";

    return;
  }

  if (profile.role !== "admin") {

    await supabaseClient.auth.signOut();

    window.location.href = "/login.html";

    return;
  }

  document.getElementById("adminEmail").textContent =
    profile.email || user.email;

  document.getElementById("loading").style.display =
    "none";

  document.getElementById("app").style.display =
    "block";
}

document
  .getElementById("logoutBtn")
  .addEventListener("click", async () => {

    await supabaseClient.auth.signOut();

    window.location.href = "/login.html";
  });

startAdmin();
