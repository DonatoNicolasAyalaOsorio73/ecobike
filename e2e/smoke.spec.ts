import { expect, test, type Page } from "@playwright/test";

// Guest-mode tour of the real web build: every main screen renders, key
// flows work, and no uncaught JS error happens anywhere along the way.

function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}

async function enterAsGuest(page: Page) {
  await page.goto("/");
  await expect(page.getByText("Muévete mejor.", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Explorar sin cuenta" }).click();
  await expect(page.getByText("Listo para pedalear")).toBeVisible();
}

const tab = (page: Page, name: string) => page.getByRole("tab", { name });

test("legal pages are public", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/legal/privacy");
  await expect(page.getByText("Política de privacidad").first()).toBeVisible();
  await expect(page.getByText("Qué datos recogemos")).toBeVisible();
  await page.goto("/legal/terms");
  await expect(page.getByText("Términos de uso").first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("guest tour: map, stats, rewards, friends, profile, settings", async ({ page }) => {
  const errors = trackErrors(page);
  await enterAsGuest(page);

  // Map: ride options menu opens and closes
  await page.getByRole("button", { name: "Opciones de recorrido" }).click();
  await expect(page.getByText("¿Cómo quieres pedalear?")).toBeVisible();
  await page.getByRole("button", { name: "Cerrar opciones de recorrido" }).click();
  await expect(page.getByText("¿Cómo quieres pedalear?")).toHaveCount(0);

  // Guest session survives a reload
  await page.reload();
  await expect(page.getByText("Listo para pedalear")).toBeVisible();

  // Stats with example data
  await tab(page, "Estadísticas").click();
  await expect(page.getByText("DATOS DE EJEMPLO")).toBeVisible();
  await expect(page.getByText("Tu racha").first()).toBeVisible();
  await expect(page.getByText("Impacto ambiental")).toBeVisible();

  // Rewards: redeem an example reward and get a code
  await tab(page, "Puntos").click();
  await expect(page.getByText("Recompensas").first()).toBeVisible();
  await page.getByRole("button", { name: /^Coldest,/ }).click();
  await page.getByRole("button", { name: "Canjear", exact: true }).click();
  await page.getByRole("button", { name: "Sí, canjear" }).click();
  await expect(page.getByText("¡Canje listo!")).toBeVisible();
  await page.getByRole("button", { name: "Listo", exact: true }).click();

  // Friends: example chat round-trip
  await tab(page, "Amigos").click();
  await page.getByRole("button", { name: /^Chat con Laura/ }).click();
  await page.getByLabel("Escribe un mensaje").fill("Prueba E2E");
  await page.getByRole("button", { name: "Enviar" }).click();
  await expect(page.getByText("Prueba E2E", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "Volver" }).first().click();
  await expect(page.getByText("Mensajes", { exact: false }).first()).toBeVisible();

  // Profile and settings
  await page.goto("/profile");
  await expect(page.getByText("Crea tu cuenta gratis")).toBeVisible();
  await page.goto("/settings");
  await expect(page.getByText(/Meta diaria/)).toBeVisible();
  await expect(page.getByText("Centro de ayuda")).toBeVisible();

  expect(errors).toEqual([]);
});

test("register form validates before contacting the server", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/register");
  await page.getByPlaceholder("Correo electrónico").fill("no-es-correo");
  await page.getByPlaceholder("Contraseña", { exact: true }).fill("Rueda-Verde12");
  await expect(page.getByText(/fuerte/i)).toBeVisible();
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page.getByText("Ese correo no parece válido.")).toBeVisible();
  await expect(page.getByText("Escribe tu nombre.")).toBeVisible();
  expect(errors).toEqual([]);
});
