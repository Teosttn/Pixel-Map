import assert from "node:assert/strict";
import test from "node:test";
import { createSessionGuard, isAllowedHost, isAllowedOrigin } from "./security.mjs";

test("allows only loopback host headers", () => {
  assert.equal(isAllowedHost("127.0.0.1:4317"), true);
  assert.equal(isAllowedHost("localhost:4317"), true);
  assert.equal(isAllowedHost("pixel-map.example.com"), false);
  assert.equal(isAllowedHost("127.0.0.1.evil.example"), false);
});

test("allows only same loopback origins", () => {
  assert.equal(isAllowedOrigin("http://127.0.0.1:4317", "127.0.0.1:4317"), true);
  assert.equal(isAllowedOrigin("http://localhost:4317", "localhost:4317"), true);
  assert.equal(isAllowedOrigin("https://attacker.example", "127.0.0.1:4317"), false);
  assert.equal(isAllowedOrigin("http://localhost:4317", "127.0.0.1:4317"), false);
});

test("rejects JSON mutations without a matching Origin", () => {
  const response = { statusCode: 200, headers: {}, setHeader(key, value) { this.headers[key] = value; }, end() {} };
  const guard = createSessionGuard({ secret: "session", allowedOrigins: ["http://127.0.0.1:4317"] });
  assert.equal(guard({ method: "POST", headers: { host: "127.0.0.1:4317", cookie: "pixel_map_admin_session=session" } }, response), false);
});
