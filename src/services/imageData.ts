import { ImageManipulator as Module, SaveFormat, type ImageManipulatorContext } from "expo-image-manipulator";

// The package's .web.d.ts types the module as a class (tsc resolves it via
// moduleSuffixes); at runtime both platforms expose `manipulate` on the instance.
const ImageManipulator = Module as unknown as { manipulate(uri: string): ImageManipulatorContext };

// Images live inside Firestore documents as small data URLs: Cloud Storage
// needs the paid Blaze plan since Feb 2026, Firestore stays free. Keep them
// tiny (logos 256 px WebP, avatars 160 px JPEG): every read of the document
// downloads the image too.

/** Resizes a picked image to fit `max` px and returns it as a data URL. */
export async function toDataUrl(uri: string, max: number, format: "webp" | "jpeg", quality: number): Promise<string> {
  const probe = await ImageManipulator.manipulate(uri).renderAsync();
  const img =
    Math.max(probe.width, probe.height) > max
      ? await ImageManipulator.manipulate(uri).resize(probe.width >= probe.height ? { width: max } : { height: max }).renderAsync()
      : probe;
  const out = await img.saveAsync({ format: format === "webp" ? SaveFormat.WEBP : SaveFormat.JPEG, compress: quality, base64: true });
  if (!out.base64) throw new Error("No se pudo procesar la imagen.");
  return `data:image/${format};base64,${out.base64}`;
}
