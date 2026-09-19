'use server'
import { generatePdfFile } from '../lib/pdfGenerator';

export async function exportResponseToPdf(title: string, content: string): Promise<{ downloadUrl: string; filename: string }> {
  return await generatePdfFile({ title, content });
}
