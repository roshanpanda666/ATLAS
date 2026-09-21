import { NextRequest, NextResponse } from 'next/server';
import { generatePdfFile } from '@/app/lib/pdfGenerator';

export async function POST(req: NextRequest) {
  try {
    const { title, content } = await req.json();
    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    const result = await generatePdfFile({
      title: title || 'Research Report',
      content,
    });

    const pdfBuffer = Buffer.from(result.base64, 'base64');

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'Content-Length': String(pdfBuffer.length),
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('PDF download API error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
