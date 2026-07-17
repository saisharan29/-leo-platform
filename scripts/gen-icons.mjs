// Generates PWA PNG icons: Cahier bleu field with the white "fil rouge" wave.
import { PNG } from "pngjs";
import { createWriteStream, writeFileSync } from "node:fs";

function makeIcon(size, file) {
  const png = new PNG({ width: size, height: size });
  const [br, bg, bb] = [36, 71, 230]; // bleu
  const r = size * 0.22; // rounded corners
  const stroke = size * 0.055;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (size * y + x) << 2;
      // rounded-square mask
      const dx = Math.max(r - x, x - (size - 1 - r), 0);
      const dy = Math.max(r - y, y - (size - 1 - r), 0);
      const inside = dx * dx + dy * dy <= r * r;
      if (!inside) { png.data[i + 3] = 0; continue; }
      // fil rouge: sine wave across the middle
      const wave = size / 2 + Math.sin((x / size) * Math.PI * 2.2 + 0.4) * size * 0.16;
      const onWave = Math.abs(y - wave) < stroke;
      // dot: the "period" at the end of the thread
      const ddx = x - size * 0.82, ddy = y - (size / 2 + Math.sin(0.82 * Math.PI * 2.2 + 0.4) * size * 0.16);
      const onDot = ddx * ddx + ddy * ddy < (stroke * 1.6) ** 2;
      if (onWave || onDot) { png.data[i] = 255; png.data[i + 1] = 255; png.data[i + 2] = 255; }
      else { png.data[i] = br; png.data[i + 1] = bg; png.data[i + 2] = bb; }
      png.data[i + 3] = 255;
    }
  }
  return new Promise((res) => png.pack().pipe(createWriteStream(file)).on("finish", res));
}
await makeIcon(192, "public/icons/icon-192.png");
await makeIcon(512, "public/icons/icon-512.png");
// maskable: same art, full-bleed square (no transparent corners)
function makeMaskable(size, file) {
  const png = new PNG({ width: size, height: size });
  const stroke = size * 0.05;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = (size * y + x) << 2;
    const wave = size / 2 + Math.sin((x / size) * Math.PI * 2.2 + 0.4) * size * 0.13;
    const on = Math.abs(y - wave) < stroke;
    png.data[i] = on ? 255 : 36; png.data[i+1] = on ? 255 : 71; png.data[i+2] = on ? 255 : 230; png.data[i+3] = 255;
  }
  return new Promise((res) => png.pack().pipe(createWriteStream(file)).on("finish", res));
}
await makeMaskable(512, "public/icons/maskable-512.png");
writeFileSync("public/manifest.webmanifest", JSON.stringify({
  name: "Léo — Learn French",
  short_name: "Léo",
  description: "French from A1 to C1: lessons, spaced repetition, honest progress.",
  start_url: "/dashboard",
  display: "standalone",
  background_color: "#FBF7F0",
  theme_color: "#2447E6",
  icons: [
    { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ],
}, null, 2));
console.log("icons + manifest written");
