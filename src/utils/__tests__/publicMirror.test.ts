import { test } from "node:test";
import assert from "node:assert/strict";
import { publicMirrorFields } from "../publicMirror.ts";

test("publicMirrorFields: only allowlisted fields pass through", () => {
  const fields = publicMirrorFields({ username: "ana", nombre: "Ana", puntosAcumulados: 50 });
  assert.deepEqual(fields, { username: "ana", nombre: "Ana", puntosAcumulados: 50 });
});

test("publicMirrorFields: sensitive fields sneaking into the input object are never included", () => {
  // Guards against a future edit accidentally widening the input type to
  // include email/identificación/fechaNacimiento (the whole reason this
  // mirror exists instead of exposing `usuarios/{uid}` directly).
  const withExtra = { username: "ana", email: "ana@example.com", fechaNacimiento: "2000-01-01" } as any;
  const fields = publicMirrorFields(withExtra);
  assert.equal("email" in fields, false);
  assert.equal("fechaNacimiento" in fields, false);
});

test("publicMirrorFields: undefined fields are omitted, not written as undefined", () => {
  const fields = publicMirrorFields({ username: "ana" });
  assert.deepEqual(Object.keys(fields), ["username"]);
});
