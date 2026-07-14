const SESSION_COOKIE = "pixel_map_admin_session";

export function isAllowedHost(host = "") {
  return /^(127\.0\.0\.1|localhost)(:\d+)?$/i.test(host);
}

export function isAllowedOrigin(origin, host) {
  if (!origin) return true;
  try {
    const value = new URL(origin);
    return value.protocol === "http:" && value.host === host && /^(127\.0\.0\.1|localhost)$/i.test(value.hostname);
  } catch {
    return false;
  }
}

function readCookie(header = "", name) {
  return header.split(";").map((part) => part.trim().split("=")).find(([key]) => key === name)?.[1];
}

function deny(res, message, code) {
  res.statusCode = 403;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(code ? { error: message, code } : { error: message }));
  return false;
}

function refreshSession(res, secret) {
  res.setHeader("Set-Cookie", `${SESSION_COOKIE}=${secret}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800`);
}

export function createSessionGuard({ secret, allowedOrigins }) {
  const origins = new Set(allowedOrigins);
  return (req, res) => {
    const host = String(req.headers.host || "");
    const origin = req.headers.origin;
    const isMutation = ["POST", "PUT", "DELETE", "PATCH"].includes(req.method || "GET");
    if (!isAllowedHost(host) || !isAllowedOrigin(origin, host)) return deny(res, "Local admin accepts loopback requests only.");
    if (isMutation && !origin) return deny(res, "Local admin mutations require a same-origin request.");
    if (origin && !origins.has(origin)) return deny(res, "Request origin is not allowed.");

    const session = readCookie(req.headers.cookie, SESSION_COOKIE);
    if (session !== secret) {
      refreshSession(res, secret);
      if (isMutation) {
        return deny(res, "Local admin session was refreshed. Retrying the request.", "SESSION_REQUIRED");
      }
    }
    return true;
  };
}
