import { test } from "node:test";
import assert from "node:assert/strict";
import { isoToBirthInput, maskBirthDate, parseBirthDate, passwordStrength, profileCompletion, validateEmail, validateName, validateUsername } from "../profileForm.ts";

const NOW = new Date(2026, 9, 1);

test("validateName accepts accented names, rejects empty, digits and long", () => {
  assert.equal(validateName("María José", "nombre"), null);
  assert.equal(validateName("O'Neil-Peña", "apellido"), null);
  assert.ok(validateName("  ", "nombre"));
  assert.ok(validateName("R2D2", "nombre"));
  assert.ok(validateName("a".repeat(41), "nombre"));
});

test("validateUsername mirrors the server rule", () => {
  assert.equal(validateUsername("ana.bike_9"), null);
  assert.equal(validateUsername("@Ana"), null); // normalized to lowercase, @ stripped
  assert.ok(validateUsername("ab"));
  assert.ok(validateUsername("ana bike"));
  assert.ok(validateUsername("a".repeat(21)));
});

test("maskBirthDate formats as you type", () => {
  assert.equal(maskBirthDate("0"), "0");
  assert.equal(maskBirthDate("0512"), "05/12");
  assert.equal(maskBirthDate("05121990"), "05/12/1990");
  assert.equal(maskBirthDate("05/12/1990xx77"), "05/12/1990");
});

test("parseBirthDate validates format, real dates and minimum age", () => {
  assert.deepEqual(parseBirthDate("", NOW), { iso: null, error: null });
  assert.equal(parseBirthDate("05/12/1990", NOW).iso, "1990-12-05");
  assert.ok(parseBirthDate("31/02/1990", NOW).error);
  assert.ok(parseBirthDate("5/12/1990", NOW).error);
  assert.ok(parseBirthDate("02/10/2013", NOW).error, "turns 13 tomorrow");
  assert.equal(parseBirthDate("01/10/2013", NOW).error, null, "turns 13 today");
  assert.equal(isoToBirthInput("1990-12-05"), "05/12/1990");
  assert.equal(isoToBirthInput(null), "");
});

test("profileCompletion counts filled fields and suggests the next one", () => {
  const empty = { firstName: "", lastName: "", username: "x", bio: "", birthDate: "", gender: "", city: "", bikeType: "", experience: "", ridingGoal: "", hasPhoto: false };
  assert.equal(profileCompletion(empty).ratio, 0);
  assert.equal(profileCompletion(empty).nextHint, "Agrega una foto");
  const full = { ...empty, firstName: "A", lastName: "B", bio: "x", birthDate: "01/01/1990", city: "C", bikeType: "Ruta", experience: "Intermedio", ridingGoal: "Salud", hasPhoto: true };
  assert.equal(profileCompletion(full).ratio, 1);
  assert.equal(profileCompletion(full).nextHint, null);
});


test("validateEmail", () => {
  assert.equal(validateEmail("ana@correo.co"), null);
  assert.ok(validateEmail(""));
  assert.ok(validateEmail("ana@correo"));
  assert.ok(validateEmail("ana correo.com"));
});

test("passwordStrength grows with length and variety; weak patterns capped", () => {
  assert.ok(passwordStrength("abc").error);
  assert.equal(passwordStrength("abcdefgh").error, null);
  assert.ok(passwordStrength("Bici-2026-Verde!").score >= 3);
  assert.ok(passwordStrength("aaaaaaaaaaaaaa").score <= 1);
  assert.ok(passwordStrength("password12345").score <= 1);
  assert.ok(passwordStrength("abcdefgh").score < passwordStrength("Rueda-Verde12").score);
});
