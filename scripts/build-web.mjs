// Oyunun web dosyalarını dist/web klasörüne kopyalar.
// Masaüstü (Electron) ve mobil (Capacitor) sürümleri bu klasörü paketler.
import { cpSync, rmSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'dist', 'web');
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const f of ['index.html', 'manifest.webmanifest', 'css', 'js', 'assets']) {
  cpSync(join(root, f), join(out, f), {
    recursive: true,
    // Kaynak logo paketlenmez (yalnızca simge üretmek için)
    filter: (src) => !src.endsWith('logo-source.png') && !src.endsWith('.DS_Store'),
  });
}
console.log('web → dist/web');
