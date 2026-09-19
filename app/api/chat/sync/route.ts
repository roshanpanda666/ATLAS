import { NextResponse } from 'next/server';
import connectToDatabase from '../../../lib/db';
import { Chat } from '../../../lib/models';
import jwt from 'jsonwebtoken';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any;

    await connectToDatabase();

    const { chatId, title, messages } = await req.json();

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'Messages are required' }, { status: 400 });
    }

    let chat;
    if (chatId) {
      chat = await Chat.findOneAndUpdate(
        { _id: chatId, userId: decoded.userId },
        { messages, updatedAt: new Date() },
        { new: true }
      );
    } else {
      chat = await Chat.create({
        userId: decoded.userId,
        title: title || messages[0]?.content?.slice(0, 40) || 'New Chat',
        messages,
      });
    }

    if (!chat) {
      return NextResponse.json({ error: 'Chat could not be created or found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, chatId: chat._id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
