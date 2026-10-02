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
  // Lands on Inicio (dashboard).
  await expect(page.getByText("Misiones de hoy")).toBeVisible();
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

test("guest tour: home, map, stats, rewards, friends, profile, settings", async ({ page }) => {
  const errors = trackErrors(page);
  await enterAsGuest(page);

  // Home: avatar opens the profile (phone: back button; desktop: sidebar)
  await page.getByRole("button", { name: "Tu perfil" }).click();
  await expect(page.getByText("Crea tu cuenta gratis")).toBeVisible();
  await tab(page, "Inicio").click();
  await expect(page.getByText("Misiones de hoy")).toBeVisible();

  await tab(page, "Mapa").click();
  // Map: the round EcoBike button opens the ride modes (incl. Eco ruta) and closes them
  await page.getByRole("button", { name: "Opciones de recorrido" }).click();
  await expect(page.getByText("¿Cómo quieres pedalear?")).toBeVisible();
  await expect(page.getByRole("button", { name: /^Eco ruta/ })).toBeVisible();
  // Entrenamiento: your own goal (distance or time), then back to the modes
  await page.getByRole("button", { name: /^Entrenamiento/ }).click();
  await expect(page.getByRole("button", { name: "Iniciar entrenamiento" })).toBeVisible();
  await page.getByRole("button", { name: "Más kilómetros" }).click();
  await expect(page.getByText("11", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Volver a los modos" }).click();
  await expect(page.getByRole("button", { name: /^Eco ruta/ })).toBeVisible();
  await page.getByRole("button", { name: "Cerrar opciones de recorrido" }).click();
  await expect(page.getByText("¿Cómo quieres pedalear?")).toHaveCount(0);

  // Guest session survives a reload
  await page.reload();
  await expect(page.getByRole("button", { name: "Opciones de recorrido" })).toBeVisible();

  // Stats with example data
  await tab(page, "Progreso").click();
  await expect(page.getByText("DATOS DE EJEMPLO")).toBeVisible();
  await expect(page.getByText("Tu racha").first()).toBeVisible();
  await expect(page.getByText("Impacto ambiental")).toBeVisible();

  // Rewards: redeem an example reward and get a code
  await tab(page, "Premios").click();
  await expect(page.getByText("Premios").first()).toBeVisible();
  await page.getByRole("button", { name: /^Coldest,/ }).first().click();
  // Redeem is one press-and-hold (the button fills, then confirms)
  const hold = page.getByRole("button", { name: "Mantén para canjear" });
  await hold.hover();
  await page.mouse.down();
  await page.waitForTimeout(1400);
  await page.mouse.up();
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

  // Friend profile
  await page.goto("/friend/demo_friend_laura");
  await expect(page.getByText("Laura Gómez").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Enviar mensaje" })).toBeVisible();

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
