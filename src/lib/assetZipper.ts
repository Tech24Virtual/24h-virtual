import JSZip from 'jszip';
import { downloadBlob } from './bannerExporter';

interface ZipAsset {
  filename: string;
  blob: Blob;
}

export async function bundleAndDownload(assets: ZipAsset[], zipName: string) {
  const zip = new JSZip();
  for (const asset of assets) {
    zip.file(asset.filename, asset.blob);
  }
  const content = await zip.generateAsync({ type: 'blob' });
  downloadBlob(content, zipName);
}
