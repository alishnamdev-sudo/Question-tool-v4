import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import workerSrc from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Set worker path
pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

export interface PageImage {
  pageNumber: number;
  dataUrl: string;
  width: number;
  height: number;
}

export async function convertPdfToImages(file: File): Promise<PageImage[]> {
  // Temporarily suppress the specific pdfjs-dist warning
  const originalWarn = console.warn;
  console.warn = (...args) => {
    if (args[0] && typeof args[0] === 'string' && args[0].includes("Dependent image isn't ready yet")) {
      return;
    }
    originalWarn(...args);
  };

  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ 
      data: arrayBuffer,
      verbosity: 0 // VerbosityLevel.ERRORS
    }).promise;
    const pageImages: PageImage[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2.0 }); // Higher scale for better quality

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) continue;

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
        canvas: canvas,
      };

      // Ensure all resources are loaded before rendering
      await page.getOperatorList();

      await page.render(renderContext).promise;
      
      // Convert to JPEG to save memory
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      
      pageImages.push({
        pageNumber: i - 1, // 0-indexed
        dataUrl,
        width: canvas.width,
        height: canvas.height,
      });
    }

    return pageImages;
  } finally {
    // Restore original console.warn
    console.warn = originalWarn;
  }
}

export function cropImage(dataUrl: string, bbox: [number, number, number, number]): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject('No context');

      const [ymin, xmin, ymax, xmax] = bbox;
      
      // Bbox is 0-1000 normalized
      const x = (xmin / 1000) * img.width;
      const y = (ymin / 1000) * img.height;
      const width = ((xmax - xmin) / 1000) * img.width;
      const height = ((ymax - ymin) / 1000) * img.height;

      // Add a small margin
      const margin = 10;
      const cropX = Math.max(0, x - margin);
      const cropY = Math.max(0, y - margin);
      const cropWidth = Math.min(img.width - cropX, width + margin * 2);
      const cropHeight = Math.min(img.height - cropY, height + margin * 2);

      if (cropWidth <= 0 || cropHeight <= 0) {
        console.warn('Invalid crop dimensions', { cropWidth, cropHeight, bbox });
        return resolve(dataUrl); // Fallback to original image
      }

      canvas.width = cropWidth;
      canvas.height = cropHeight;

      ctx.drawImage(img, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}
