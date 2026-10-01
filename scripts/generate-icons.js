// One-off asset generation from assets/logo.png (the real EcoBike mark).
// Run with: node scripts/generate-icons.js
// ponytail: not wired into any build step — icons rarely change, regenerate by hand.
const sharp = require("sharp");
const path = require("path");

const SRC = path.join(__dirname, "..", "assets", "logo.png");
const OUT = (name) => path.join(__dirname, "..", "assets", name);

// EcoBike's light background token (colors.ts lightColorTokens.bgTop / bgBottom-ish)
const BG = "#F6FBF3";

async function run() {
  // App icon: iOS forbids alpha in icons, so flatten onto the brand background
  // and inset the logo so it isn't cropped by the OS's rounded-corner mask.
  const logo = sharp(SRC);

  await sharp({ create: { width: 1024, height: 1024, channels: 4, background: BG } })
    .composite([{ input: await logo.clone().resize(760, 760, { fit: "contain" }).toBuffer(), gravity: "center" }])
    .flatten({ background: BG })
    .png()
    .toFile(OUT("icon.png"));

  // Adaptive icon (Android): foreground layer only, transparent background —
  // the OS composites it over whatever mask/background shape it wants.
  await sharp({ create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: await logo.clone().resize(680, 680, { fit: "contain" }).toBuffer(), gravity: "center" }])
    .png()
    .toFile(OUT("adaptive-icon.png"));

  await sharp({ create: { width: 196, height: 196, channels: 4, background: BG } })
    .composite([{ input: await logo.clone().resize(150, 150, { fit: "contain" }).toBuffer(), gravity: "center" }])
    .flatten({ background: BG })
    .png()
    .toFile(OUT("favicon.png"));

  await sharp({ create: { width: 1284, height: 1284, channels: 4, background: BG } })
    .composite([{ input: await logo.clone().resize(560, 560, { fit: "contain" }).toBuffer(), gravity: "center" }])
    .flatten({ background: BG })
    .png()
    .toFile(OUT("splash-icon.png"));

  console.log("Generated icon.png, adaptive-icon.png, favicon.png, splash-icon.png from logo.png");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
