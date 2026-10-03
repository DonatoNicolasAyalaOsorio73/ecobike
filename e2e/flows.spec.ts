import { expect, test, type Page, type Route } from "@playwright/test";

// Signed-in flows on the test build (dist-e2e/, see src/services/e2e.ts):
// admin panel, real redemption and Eco ruta. Every server and map service is
// mocked with page.route, and Firebase hosts are blocked: nothing here can
// reach a real project.
test.use({ baseURL: "http://localhost:8083", geolocation: { latitude: 1.2136, longitude: -77.2811 }, permissions: ["geolocation"] });

const UID = "e2e_user";
const CATALOG = [
  { id: "coldest", data: { name: "Coldest", description: "2x1 en bebidas", pointsRequired: 400, logo: "https://example.test/coldest.png", isActive: true } },
  { id: "ciclofix", data: { name: "Taller CicloFix", description: "Revisión gratis", pointsRequired: 900, isActive: true } },
];

/** A complete UserProfile, the shape fetchUserProfile returns for a real account. */
function profile(over: Record<string, unknown> = {}) {
  return {
    uid: UID,
    email: "e2e@example.test",
    displayName: "Eva Prueba",
    username: "eva",
    photoURL: null,
    city: "Pasto",
    bikeType: null,
    firstName: "Eva",
    lastName: "Prueba",
    bio: null,
    birthDate: null,
    gender: null,
    experience: null,
    ridingGoal: null,
    friends: [],
    puntosAcumulados: 500,
    role: "user",
    createdAt: Date.now() - 30 * 86_400_000,
    providers: ["password"],
    emailVerified: true,
    ...over,
  };
}

type ApiHandler = (body: any, route: Route, url: URL) => { status?: number; json: unknown } | undefined;

/** Signs the test session in, blocks Firebase, and mocks /api/<path>. Returns the requests seen. */
async function setup(page: Page, opts: { profile?: Record<string, unknown>; api?: Record<string, ApiHandler> } = {}) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const calls: { method: string; path: string; body: any }[] = [];
  await page.addInitScript((session) => {
    (window as any).__ECOBIKE_E2E__ = session;
    // A returning user: goals already personalized, so no onboarding.
    if (!localStorage.getItem("ecobike_settings_v1")) localStorage.setItem("ecobike_settings_v1", JSON.stringify({ onboardingDone: true }));
  }, {
    uid: UID,
    token: "e2e-token",
    profile: profile(opts.profile),
    catalog: CATALOG,
  });
  await page.route(/googleapis\.com|firebaseio\.com|firebasestorage\.app/, (r) => r.abort());
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const name = url.pathname.replace(/^\/api\//, "");
    const raw = route.request().postData();
    const body = raw ? JSON.parse(raw) : null;
    calls.push({ method: route.request().method(), path: `${name}${url.search}`, body });
    const out = opts.api?.[`${route.request().method()} ${name}`]?.(body, route, url);
    if (!out) return route.fulfill({ status: 404, json: { error: `sin mock: ${name}` } });
    return route.fulfill({ status: out.status ?? 200, json: out.json });
  });
  return { errors, calls };
}

async function hold(page: Page, name: string) {
  await page.getByRole("button", { name }).hover();
  await page.mouse.down();
  await page.waitForTimeout(1400);
  await page.mouse.up();
}

// ─── Admin panel ───────────────────────────────────────────────────────────

const STORES = [
  { id: "coldest", name: "Coldest", pointsRequired: 400, logo: "https://example.test/coldest.png", isActive: true },
  { id: "ciclofix", name: "Taller CicloFix", pointsRequired: 900, logo: "", isActive: false },
];
const USERS = [
  { uid: "u1", username: "laura", nombre: "Laura", apellido: "Gómez", email: null, photo: null, role: "partner", storeId: "coldest", points: 820, active: true },
  { uid: "u2", username: "pedro", nombre: "Pedro", apellido: "Ruiz", email: null, photo: null, role: "user", storeId: null, points: 95, active: false },
];
const detail = (points = 820) => ({
  user: { ...USERS[0], points, disabled: false, providers: ["password"], createdAt: null, lastSignIn: null, emailVerified: true, stats: { rides: 14, verifiedRides: 11, codes: 2 } },
  logs: [{ id: "l1", adminUid: UID, action: "user.update", details: { points: { from: 700, to: 820, reason: "Compensación por fallo GPS" } }, at: Date.now() - 86_400_000 }],
});
const adminApi: Record<string, ApiHandler> = {
  "GET users": (_b, _r, url) =>
    url.searchParams.has("stats")
      ? { json: { users: 1284, ridesWeek: 312, kmWeek: 2140, pointsWeek: 9800, redemptionsWeek: 37, codesUsedTotal: 410, stores: 2 } }
      : url.searchParams.has("id")
        ? { json: detail() }
        : { json: { users: USERS, next: null } },
  "PUT users": (body) => ({ json: detail(body.points ?? 820) }),
  "GET stores": () => ({ json: { stores: STORES } }),
  "PUT stores": (body) => ({ json: { store: { ...STORES[0], ...body } } }),
};

test("admin: dashboard lists stores (flags missing logos) and users", async ({ page }) => {
  const { errors } = await setup(page, { profile: { role: "admin" }, api: adminApi });
  await page.goto("/settings/admin");
  await expect(page.getByText("Administración").first()).toBeVisible();
  await expect(page.getByText("1.284")).toBeVisible();
  await expect(page.getByRole("button", { name: "Editar Coldest" })).toBeVisible();
  await expect(page.getByText("1 tienda sin logo", { exact: false })).toBeVisible();
  await page.getByText("Usuarios", { exact: true }).last().click();
  await expect(page.getByRole("button", { name: "Gestionar @laura" })).toBeVisible();
  await expect(page.getByText("Partner")).toBeVisible();
  expect(errors).toEqual([]);
});

test("admin: edit a store's points through the API", async ({ page }) => {
  const { errors, calls } = await setup(page, { profile: { role: "admin" }, api: adminApi });
  await page.goto("/settings/admin");
  await page.getByRole("button", { name: "Editar Coldest" }).click();
  await expect(page.getByText("Editar tienda").first()).toBeVisible();
  const points = page.getByRole("textbox", { name: "Puntos" });
  await expect(points).toHaveValue("400");
  await points.fill("450");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect.poll(() => calls.find((c) => c.method === "PUT" && c.path === "stores")?.body).toMatchObject({ id: "coldest", pointsRequired: 450 });
  await expect(page.getByRole("button", { name: "Editar Coldest" })).toBeVisible(); // back on the list
  expect(errors).toEqual([]);
});

test("admin: adjust a user's points with a reason and the balance it was based on", async ({ page }) => {
  const { errors, calls } = await setup(page, { profile: { role: "admin" }, api: adminApi });
  await page.goto("/settings/admin/user?id=u1");
  await expect(page.getByText("Laura Gómez").first()).toBeVisible();
  await expect(page.getByText("Compensación por fallo GPS", { exact: false })).toBeVisible();
  await page.getByRole("textbox", { name: "Puntos" }).fill("900");
  const adjust = page.getByRole("button", { name: "Ajustar puntos" });
  await expect(adjust).toBeDisabled(); // a reason is required
  await page.getByPlaceholder("Motivo del ajuste (queda registrado)").fill("Bono evento ciclovía");
  await adjust.click();
  await expect(page.getByText("Puntos ajustados.")).toBeVisible();
  expect(calls.find((c) => c.method === "PUT" && c.path === "users")?.body).toEqual({ id: "u1", points: 900, reason: "Bono evento ciclovía", expectedPoints: 820 });
  expect(errors).toEqual([]);
});

test("admin screens refuse other roles, even by direct link", async ({ page }) => {
  const { errors, calls } = await setup(page, { profile: { role: "partner", storeId: "coldest" }, api: adminApi });
  await page.goto("/settings/admin");
  await expect(page.getByText("Tienda aliada").first()).toBeVisible();
  await expect(page.getByText("Validar código")).toBeVisible();
  await expect(page.getByRole("button", { name: "Editar Coldest" })).toHaveCount(0);
  await page.goto("/settings/admin/user?id=u1");
  await expect(page.getByText("No tienes permisos de administrador.")).toBeVisible();
  await page.goto("/settings/admin/store?id=coldest");
  await expect(page.getByText("No tienes permisos de administrador.")).toBeVisible();
  expect(calls.filter((c) => c.path.startsWith("users") || c.path.startsWith("stores"))).toEqual([]);
  expect(errors).toEqual([]);
});

// ─── Real redemption (server decides) ──────────────────────────────────────

async function openColdest(page: Page) {
  await page.goto("/points");
  await expect(page.getByText("Premios").first()).toBeVisible();
  await page.getByRole("button", { name: /^Coldest,/ }).first().click();
}

test("redeem: the server's code is shown", async ({ page }) => {
  const { errors, calls } = await setup(page, {
    api: { "POST redeem": () => ({ json: { id: "c1", code: "ECO7K2Q9", rewardId: "coldest", rewardTitle: "Coldest", pointsSpent: 400, balance: 100 } }) },
  });
  await openColdest(page);
  await hold(page, "Mantén para canjear");
  await expect(page.getByText("¡Canje listo!")).toBeVisible();
  await expect(page.getByText("ECO7K2Q9")).toBeVisible();
  expect(calls.find((c) => c.path === "redeem")?.body).toEqual({ rewardId: "coldest" }); // never a client price
  expect(errors).toEqual([]);
});

test("redeem: a server limit is shown and the button can be held again", async ({ page }) => {
  let attempts = 0;
  const { errors } = await setup(page, {
    api: {
      "POST redeem": () =>
        ++attempts === 1
          ? { status: 429, json: { error: "Ya hiciste un canje hoy. Podrás canjear de nuevo en 24 horas." } }
          : { json: { id: "c2", code: "ECO2RETRY", rewardId: "coldest", rewardTitle: "Coldest", pointsSpent: 400, balance: 100 } },
    },
  });
  await openColdest(page);
  await hold(page, "Mantén para canjear");
  await expect(page.getByText("Ya hiciste un canje hoy", { exact: false })).toBeVisible();
  await hold(page, "Mantén para canjear");
  await expect(page.getByText("ECO2RETRY")).toBeVisible();
  expect(errors).toEqual([]);
});

test("redeem: without enough points the button is disabled and no request is sent", async ({ page }) => {
  const { errors, calls } = await setup(page, { profile: { puntosAcumulados: 100 } });
  await openColdest(page);
  await expect(page.getByText("Te faltan 300 pts").last()).toBeVisible(); // the sheet (the card behind says it too)
  await expect(page.getByRole("button", { name: "Puntos insuficientes" })).toBeDisabled();
  expect(calls.filter((c) => c.path === "redeem")).toEqual([]);
  expect(errors).toEqual([]);
});

// ─── Eco ruta ──────────────────────────────────────────────────────────────

/** Google polyline encoding (precision 6), to build a Valhalla-like shape. */
function encode(points: [number, number][], precision = 6) {
  const f = 10 ** precision;
  let out = "";
  let pl = 0;
  let pg = 0;
  const one = (v: number) => {
    let n = v < 0 ? ~(v << 1) : v << 1;
    while (n >= 0x20) {
      out += String.fromCharCode((0x20 | (n & 0x1f)) + 63);
      n >>= 5;
    }
    out += String.fromCharCode(n + 63);
  };
  for (const [lat, lng] of points) {
    const a = Math.round(lat * f);
    const b = Math.round(lng * f);
    one(a - pl);
    one(b - pg);
    pl = a;
    pg = b;
  }
  return out;
}

test("eco ruta: search near me, preview the green route and start riding it", async ({ page }) => {
  const { errors } = await setup(page);
  let photonQuery: URL | null = null;
  await page.route("https://photon.komoot.io/**", (route) => {
    photonQuery = new URL(route.request().url());
    return route.fulfill({
      json: {
        features: [
          { geometry: { coordinates: [-77.2701, 1.2201] }, properties: { name: "Parque Infantil", city: "Pasto", state: "Nariño" } },
          { geometry: { coordinates: [-74.07, 4.6] }, properties: { name: "Parque Infantil Bogotá", city: "Bogotá" } },
        ],
      },
    });
  });
  const shape = encode(Array.from({ length: 30 }, (_, i) => [1.2136 + i * 0.00022, -77.2811 + i * 0.00037] as [number, number]));
  await page.route("https://valhalla1.openstreetmap.de/**", (route) =>
    route.fulfill({
      json: {
        trip: {
          summary: { length: 1.4, time: 330 },
          legs: [{ shape, maneuvers: [{ instruction: "Sal hacia el noreste.", type: 1, begin_shape_index: 0 }, { instruction: "Gira a la derecha en la Calle 18.", type: 10, begin_shape_index: 12 }, { instruction: "Llegaste.", type: 4, begin_shape_index: 29 }] }],
        },
      },
    })
  );

  await page.goto("/map");
  await page.getByRole("button", { name: "Opciones de recorrido" }).click();
  await page.getByRole("button", { name: /^Eco ruta/ }).click();
  await page.getByRole("textbox", { name: "Buscar destino" }).fill("parque infantil");
  const near = page.getByRole("button", { name: /^Parque Infantil, Pasto/ });
  await expect(near).toBeVisible();
  // Results near the rider come first; the search only got a ~100 m position.
  await expect(page.getByRole("button", { name: /^Parque Infantil/ }).first()).toHaveAttribute("aria-label", /Pasto/);
  expect(photonQuery!.searchParams.get("lat")).toBe("1.214");
  await near.click();
  await expect(page.getByText("1.4 km")).toBeVisible();
  await expect(page.getByText("6 min")).toBeVisible();
  await page.getByRole("button", { name: "Iniciar eco ruta" }).click();
  // Riding: the turn-by-turn banner follows the planned route.
  await expect(page.getByText("Gira a la derecha en la Calle 18.")).toBeVisible();
  await expect(page.getByText(/Quedan 1,4 km/)).toBeVisible();
  expect(errors).toEqual([]);
});
