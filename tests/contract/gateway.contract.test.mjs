import test from "node:test";
import assert from "node:assert/strict";

const baseUrl = process.env.GATEWAY_BASE_URL ?? "http://localhost:3000";

test("gateway health contract", async () => {
  const res = await fetch(`${baseUrl}/health`);
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.success, true);
  assert.equal(json.service, "gateway");
});

test("gateway docs contract", async () => {
  const res = await fetch(`${baseUrl}/api/v1/docs`);
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.success, true);
  assert.ok(Array.isArray(json.data.endpoints));
});
