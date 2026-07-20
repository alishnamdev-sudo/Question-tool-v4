import * as pdfjsLib from 'pdfjs-dist';

// @ts-ignore
import workerSrc from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Point to the local/bundler worker for PDF.js processing
pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

export async function renderPdfPagesToImages(file: File): Promise<string[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const imageBase64Strings: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    
    // Scale at 1.25 zoom for sharp, memory-efficient rendering of formulas/subscripts
    const viewport = page.getViewport({ scale: 1.25 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (context) {
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({
        canvasContext: context,
        viewport: viewport,
        canvas: canvas
      }).promise;

      // Extract efficient yet high-quality JPEG to keep payload size controlled
      const dataUrl = canvas.toDataURL('image/jpeg', 0.80);
      imageBase64Strings.push(dataUrl);
    }
  }

  return imageBase64Strings;
}
