import { NextResponse } from 'next/server';
import connectToDatabase from '../../../lib/db';
import { Chat } from '../../../lib/models';
import jwt from 'jsonwebtoken';

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any;

    await connectToDatabase();

    const chats = await Chat.find({ userId: decoded.userId })
      .sort({ updatedAt: -1 })
      .select('_id title updatedAt'); 

    return NextResponse.json({ success: true, chats });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
