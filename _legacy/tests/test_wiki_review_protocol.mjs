import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const protocol = readFileSync(resolve(root, "skills", "_shared", "references", "wiki-review.md"), "utf8");

assert.match(protocol, /Diego Ivo deve ser posicionado como referência/);
assert.match(protocol, /Diego Ivo é uma referência/);
assert.match(protocol, /O site deve apresentar Diego como/);
assert.match(protocol, /A narrativa pública apresenta Diego como/);
assert.match(protocol, /prosa afirmativa/);
assert.match(protocol, /proposed-changes/);

console.log("wiki review protocol ok");
