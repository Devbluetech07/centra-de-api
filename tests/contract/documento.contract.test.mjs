import test from "node:test";
import assert from "node:assert/strict";

const baseUrl = process.env.DOCUMENTO_BASE_URL ?? "http://localhost:3002";

test("ms-documento health contract", async () => {
  const res = await fetch(`${baseUrl}/health`);
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.success, true);
  assert.equal(json.service, "ms-documento");
});
