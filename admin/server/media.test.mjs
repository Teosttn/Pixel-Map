import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeMediaName } from "./media.mjs";

test("sanitizes uploaded media names", () => {
  assert.equal(sanitizeMediaName("../../My Image.png", "abc123"), "my-image-abc123.png");
});
