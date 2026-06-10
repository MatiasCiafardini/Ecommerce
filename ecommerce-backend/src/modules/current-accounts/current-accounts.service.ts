import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterCurrentAccountPaymentDto } from './dto/register-current-account-payment.dto';

const accountInclude = {
  customer: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      document: true,
    },
  },
  movements: {
    take: 1,
    orderBy: { createdAt: 'desc' as const },
    select: {
      id: true,
      type: true,
      amount: true,
      paymentMethod: true,
      description: true,
      createdAt: true,
      balanceAfter: true,
    },
  },
} as const;

@Injectable()
export class CurrentAccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(storeId: number, status: 'debt' | 'paid' | 'all' = 'debt', search = '') {
    const normalizedSearch = search.trim();

    const balanceFilter =
      status === 'debt'
        ? { gt: 0 }
        : status === 'paid'
          ? { equals: 0 }
          : undefined;

    return this.prisma.currentAccount.findMany({
      where: {
        storeId,
        ...(balanceFilter ? { balance: balanceFilter } : {}),
        ...(normalizedSearch
          ? {
              customer: {
                OR: [
                  { email: { contains: normalizedSearch, mode: 'insensitive' } },
                  { firstName: { contains: normalizedSearch, mode: 'insensitive' } },
                  { lastName: { contains: normalizedSearch, mode: 'insensitive' } },
                  { phone: { contains: normalizedSearch, mode: 'insensitive' } },
                  { document: { contains: normalizedSearch, mode: 'insensitive' } },
                ],
              },
            }
          : {}),
      },
      include: accountInclude,
      orderBy: [
        { balance: 'desc' },
        { lastMovementAt: 'desc' },
      ],
    });
  }

  async findByCustomer(storeId: number, customerId: number) {
    const account = await this.prisma.currentAccount.findUnique({
      where: {
        storeId_customerId: {
          storeId,
          customerId,
        },
      },
      include: {
        customer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            document: true,
          },
        },
        movements: {
          orderBy: { createdAt: 'desc' },
          include: {
            order: {
              select: {
                id: true,
                total: true,
                status: true,
                createdAt: true,
              },
            },
            createdByUser: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!account) {
      throw new NotFoundException('Current account not found');
    }

    return account;
  }

  async registerPayment(
    storeId: number,
    customerId: number,
    createdByUserId: number | undefined,
    dto: RegisterCurrentAccountPaymentDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const account = await tx.currentAccount.findUnique({
        where: {
          storeId_customerId: {
            storeId,
            customerId,
          },
        },
      });

      if (!account) {
        throw new NotFoundException('Current account not found');
      }

      const currentBalance = Number(account.balance);
      const amount = Number(dto.amount);

      if (!Number.isFinite(amount) || amount <= 0) {
        throw new BadRequestException('Payment amount must be greater than 0');
      }

      if (amount > currentBalance) {
        throw new BadRequestException('Payment cannot exceed current balance');
      }

      const nextBalance = roundCurrency(currentBalance - amount);

      const updatedAccount = await tx.currentAccount.update({
        where: { id: account.id },
        data: {
          balance: nextBalance,
          lastMovementAt: new Date(),
        },
      });

      const movement = await tx.currentAccountMovement.create({
        data: {
          storeId,
          accountId: account.id,
          customerId,
          type: 'PAYMENT',
          amount: -amount,
          paymentMethod: dto.paymentMethod,
          description: dto.description?.trim() || 'Pago de cuenta corriente',
          createdByUserId,
          balanceAfter: nextBalance,
        },
      });

      return {
        account: updatedAccount,
        movement,
      };
    });
  }
}

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
