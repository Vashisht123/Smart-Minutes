'use server';

import { prisma } from "@/lib/db";

// Function 1: Fetch History
export async function getSessions(userId: string) {
  try {
    const sessions = await prisma.session.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10 // Get last 10 meetings
    });
    return sessions;
  } catch (error) {
    console.error("Failed to fetch sessions:", error);
    return [];
  }
}

// Function 2: Rename Session
export async function updateSessionTitle(sessionId: string, newTitle: string) {
  try {
    const updated = await prisma.session.update({
      where: { id: sessionId },
      data: { title: newTitle },
    });
    return updated;
  } catch (error) {
    console.error("Failed to update title:", error);
    throw new Error("Failed to update title");
  }
}