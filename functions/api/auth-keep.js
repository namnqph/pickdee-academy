// Cloudflare Pages Function /api/auth-keep — giữ đăng nhập ít nhất 30 ngày.
// Safari iPhone (ITP) / trình duyệt trong Zalo, Telegram có thể xoá localStorage sau vài ngày → mất phiên.
// Cookie HttpOnly do chính pickdee.vn đặt không bị xoá kiểu đó → lưu refresh token mới nhất ở đây,
// localStorage mất thì config.js gọi "restore" lấy lại phiên. Hạn 30 ngày, gia hạn mỗi lần token được làm mới.
//   POST {action:"save", refresh_token} → đặt cookie
//   POST {action:"restore"}            → đổi refresh token trong cookie lấy phiên mới (Supabase), đặt cookie mới
//   DELETE                             → xoá cookie (đăng xuất)

const SUPABASE_URL = "https://snxztjsluhdibrklougo.supabase.co";
const PUBLISHABLE_KEY = "sb_publishable_DvbmLROzxKtDU_V9ACO4-Q_hUSDjmK0";
const MAX_AGE = 30 * 24 * 60 * 60;
const TOKEN = /^[A-Za-z0-9._-]{8,1024}$/;

function cookies(token) {
  const live = token != null;
  return [
    // Token: chỉ server đọc, chỉ gửi tới /api/auth-keep
    `pd_rt=${live ? token : ""}; Path=/api/auth-keep; Max-Age=${live ? MAX_AGE : 0}; HttpOnly; Secure; SameSite=Lax`,
    // Dấu hiệu cho config.js biết có phiên để lấy lại (không chứa token)
    `pd_rt_hint=${live ? "1" : ""}; Path=/; Max-Age=${live ? MAX_AGE : 0}; Secure; SameSite=Lax`
  ];
}

function reply(status, body, token) {
  const headers = new Headers({ "Content-Type": "application/json", "Cache-Control": "no-store" });
  if (token !== undefined) {
    cookies(token).forEach(c => headers.append("Set-Cookie", c));
  }
  return new Response(JSON.stringify(body), { status, headers });
}

function sameOrigin(request) {
  return request.headers.get("Origin") === new URL(request.url).origin;
}

function readCookie(request, name) {
  const m = (request.headers.get("Cookie") || "").match(new RegExp("(?:^|;\\s*)" + name + "=([^;]*)"));
  return m ? m[1] : "";
}

export async function onRequestPost({ request }) {
  if (!sameOrigin(request)) {
    return reply(403, { ok: false });
  }

  const body = await request.json().catch(() => ({}));

  if (body.action === "save") {
    const token = String(body.refresh_token || "");
    if (!TOKEN.test(token)) {
      return reply(400, { ok: false });
    }
    return reply(200, { ok: true }, token);
  }

  if (body.action === "restore") {
    const token = readCookie(request, "pd_rt");
    if (!TOKEN.test(token)) {
      return reply(401, { ok: false }, null);
    }

    const res = await fetch(SUPABASE_URL + "/auth/v1/token?grant_type=refresh_token", {
      method: "POST",
      headers: { apikey: PUBLISHABLE_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: token })
    });

    if (!res.ok) {
      // Token bị thu hồi / hết hạn phía Supabase → xoá cookie; lỗi tạm (5xx) thì giữ để thử lại
      return reply(401, { ok: false }, res.status >= 500 ? undefined : null);
    }

    const session = await res.json();
    if (!session.access_token || !TOKEN.test(session.refresh_token || "")) {
      return reply(502, { ok: false });
    }

    return reply(200, {
      ok: true,
      access_token: session.access_token,
      refresh_token: session.refresh_token
    }, session.refresh_token);
  }

  return reply(400, { ok: false });
}

export async function onRequestDelete({ request }) {
  if (!sameOrigin(request)) {
    return reply(403, { ok: false });
  }
  return reply(200, { ok: true }, null);
}
