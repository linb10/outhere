// Compress to ≤150 KB WebP data URLs (no Firebase Storage on Spark).
const MAX_BYTES = 150 * 1024;

export async function compressImage(file: File): Promise<string> {
  const bmp = await createImageBitmap(file);
  let maxSide = 1280;
  for (let attempt = 0; attempt < 6; attempt++) {
    const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    for (const q of [0.8, 0.65, 0.5]) {
      const url = canvas.toDataURL('image/webp', q);
      if (url.length * 0.75 <= MAX_BYTES) return url;
    }
    maxSide = Math.round(maxSide * 0.75);
  }
  throw new Error('Image too large');
}
