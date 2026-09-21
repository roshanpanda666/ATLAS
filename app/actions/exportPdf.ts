'use server'
import { generatePdfFile } from '../lib/pdfGenerator';

export async function exportResponseToPdf(title: string, content: string): Promise<{ downloadUrl: string; dataUrl: string; filename: string; base64: string }> {
  return await generatePdfFile({ title, content });
}
