import assert from "node:assert/strict";

const { taskResultReady } = await import("../dist/seo-brain.js");

assert.equal(
  taskResultReady({
    tasks: [{ status_code: 40602, status_message: "Task In Queue.", result: null }],
  }),
  false,
);

assert.equal(
  taskResultReady({
    tasks: [{ status_code: 20000, status_message: "Ok.", result: [{ items: [] }] }],
  }),
  true,
);

console.log("dataforseo modes ok");
