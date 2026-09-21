import { tool } from 'ai';
import { z } from 'zod';
import { generatePdfFile } from '../../lib/pdfGenerator';

export const pdfTool = tool({
  description: 'Generate a downloadable PDF document summarizing research findings, articles, or analysis. Call this immediately after completing web search or Wikipedia research so the user receives a downloadable report, OR whenever the user explicitly asks for a PDF or document.',
  inputSchema: z.object({
    title: z.string().describe('The title of the PDF report, e.g. "Quantum Computing Research Report"'),
    content: z.string().describe('The comprehensive, structured content and research findings to include in the PDF document'),
  }),
  execute: async ({ title, content }) => {
    console.log("generating downloadable pdf report...");
    try {
      const { downloadUrl, filename } = await generatePdfFile({ title, content });
      return {
        success: true,
        title,
        downloadUrl,
        filename,
        message: `PDF generated successfully at ${downloadUrl}. The UI will automatically provide a prominent Download button. If you link to the PDF in markdown, use ONLY the exact relative path: [📥 Download ${title} (PDF)](${downloadUrl}). Never use fake domains like example.com.`,
      };
    } catch (error) {
      console.error("PDF generation failed:", error);
      return { error: `Failed to generate PDF: ${String(error)}` };
    }
  },
});
