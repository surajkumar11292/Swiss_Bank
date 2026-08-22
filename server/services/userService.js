import bcrypt from 'bcryptjs';
import prisma from '../config/prisma.js';
import { ApiException } from '../middlewares/errorHandler.js';

export const userService = {
  async register({ fullName, email, password, phone, dateOfBirth, panNumber, address }) {
    const normalizedEmail = email.trim().toLowerCase();
    
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      throw ApiException.conflict('An account already exists for that email');
    }

    if (dateOfBirth) {
      const dob = new Date(dateOfBirth);
      const minAgeDate = new Date();
      minAgeDate.setFullYear(minAgeDate.getFullYear() - 18);
      if (dob > minAgeDate) {
        throw ApiException.badRequest('You must be at least 18 years old to open an account');
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);

    return prisma.user.create({
      data: {
        fullName: fullName.trim(),
        email: normalizedEmail,
        passwordHash,
        phone: phone ? phone.trim() : null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        panNumber: panNumber ? panNumber.trim().toUpperCase() : null,
        address: address ? address.trim() : null,
        role: 'USER',
      },
    });
  },

  async byEmail(email) {
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (!user) {
      throw ApiException.notFound('User not found');
    }
    return user;
  },

  async byId(id) {
    const user = await prisma.user.findUnique({
      where: { id: Number(id) },
    });
    if (!user) {
      throw ApiException.notFound('User not found');
    }
    return user;
  },

  async changePassword(user, currentPassword, newPassword) {
    const matches = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!matches) {
      throw ApiException.forbidden('Current password is incorrect');
    }
    const newHash = await bcrypt.hash(newPassword, 10);
    return prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });
  },

  async allUsers() {
    return prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        accounts: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  },
};

export function toUserResponse(user) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    phone: user.phone,
    dateOfBirth: user.dateOfBirth ? user.dateOfBirth.toISOString().split('T')[0] : null,
    panNumber: user.panNumber,
    address: user.address,
    totpEnabled: user.totpEnabled,
  };
}

export default userService;
