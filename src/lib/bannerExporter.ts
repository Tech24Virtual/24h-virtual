import html2canvas from 'html2canvas';

export async function exportElementAsPNG(
  element: HTMLElement,
  width: number,
  height: number,
  scale: 1 | 2 = 1
): Promise<Blob> {
  const canvas = await html2canvas(element, {
    width,
    height,
    scale,
    useCORS: true,
    allowTaint: true,
    backgroundColor: null,
  });
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), 'image/png');
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadImageFromSrc(src: string, filename: string) {
  const a = document.createElement('a');
  a.href = src;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export async function exportElementAsScaledPNG(
  element: HTMLElement,
  width: number,
  height: number
) {
  const blob1x = await exportElementAsPNG(element, width, height, 1);
  const blob2x = await exportElementAsPNG(element, width, height, 2);
  return { blob1x, blob2x };
}
