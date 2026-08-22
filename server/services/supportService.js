import prisma from '../config/prisma.js';
import { ApiException } from '../middlewares/errorHandler.js';

function formatTicketNumber(id) {
  return `TKT-${String(id).padStart(6, '0')}`;
}

export function toSupportTicketResponse(t) {
  return {
    id: t.id,
    ticketNumber: formatTicketNumber(t.id),
    subject: t.subject,
    message: t.message,
    status: t.status,
    createdAt: t.createdAt ? t.createdAt.toISOString() : null,
  };
}

export function toAdminTicketResponse(t) {
  return {
    id: t.id,
    ticketNumber: formatTicketNumber(t.id),
    subject: t.subject,
    message: t.message,
    status: t.status,
    createdAt: t.createdAt ? t.createdAt.toISOString() : null,
    ownerName: t.owner ? t.owner.fullName : 'Unknown',
    ownerEmail: t.owner ? t.owner.email : 'Unknown',
  };
}

export const supportService = {
  async raise(owner, { subject, message }) {
    if (!subject || !message) {
      throw ApiException.badRequest('Subject and message are required');
    }

    const created = await prisma.supportTicket.create({
      data: {
        ownerId: owner.id,
        subject: subject.trim(),
        message: message.trim(),
        status: 'OPEN',
      },
    });

    return toSupportTicketResponse(created);
  },

  async mine(owner) {
    const list = await prisma.supportTicket.findMany({
      where: { ownerId: owner.id },
      orderBy: { createdAt: 'desc' },
    });
    return list.map(toSupportTicketResponse);
  },

  async allTickets() {
    const list = await prisma.supportTicket.findMany({
      include: { owner: true },
      orderBy: { createdAt: 'desc' },
    });
    return list.map(toAdminTicketResponse);
  },

  async close(id) {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: Number(id) },
    });
    if (!ticket) {
      throw ApiException.notFound(`Ticket #${id} not found`);
    }

    await prisma.supportTicket.update({
      where: { id: Number(id) },
      data: { status: 'CLOSED' },
    });
  },
};

export default supportService;
