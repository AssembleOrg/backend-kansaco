import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, ILike } from 'typeorm';
import { UserEvent } from './user-event.entity';
import { User } from '../user/user.entity';
import { Order } from '../order/order.entity';
import { DateTime } from 'luxon';
import { nowAsDate } from '../helpers/date.helper';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger('AnalyticsService');

  constructor(
    @InjectRepository(UserEvent)
    private readonly eventRepo: Repository<UserEvent>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
  ) {}

  /** Calcula rango de fechas segun el periodo o custom dateFrom/dateTo */
  private getDateRange(period?: string, dateFrom?: string, dateTo?: string): { start: Date | null; end: Date | null } {
    if (period === 'custom' && dateFrom) {
      const start = new Date(dateFrom);
      const end = dateTo ? new Date(dateTo) : new Date();
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }

    if (!period || period === 'all') return { start: null, end: null };

    const now = DateTime.now().setZone('America/Argentina/Buenos_Aires');
    let start: Date | null = null;

    switch (period) {
      case 'week':
        start = now.startOf('week').toJSDate();
        break;
      case 'month':
        start = now.startOf('month').toJSDate();
        break;
      case 'year':
        start = now.startOf('year').toJSDate();
        break;
      case 'lastYear':
        start = now.minus({ years: 1 }).startOf('year').toJSDate();
        return { start, end: now.minus({ years: 1 }).endOf('year').toJSDate() };
      default:
        break;
    }

    return { start, end: null };
  }

  async trackEvent(
    userId: string | null,
    eventType: string,
    payload?: Record<string, any>,
  ): Promise<void> {
    try {
      const event = this.eventRepo.create({
        userId,
        eventType,
        payload: payload || null,
      });
      await this.eventRepo.save(event);
    } catch (error) {
      this.logger.error(`Failed to track event: ${error.message}`);
    }
  }

  async getEvents(options: {
    page?: number;
    limit?: number;
    userId?: string;
    eventType?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
  }) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(Math.max(1, options.limit || 20), 100);

    const qb = this.eventRepo
      .createQueryBuilder('event')
      .orderBy('event.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (options.userId) {
      qb.andWhere('event.userId = :userId', { userId: options.userId });
    }

    if (options.eventType) {
      qb.andWhere('event.eventType = :eventType', {
        eventType: options.eventType,
      });
    }

    if (options.dateFrom) {
      qb.andWhere('event.createdAt >= :dateFrom', {
        dateFrom: new Date(options.dateFrom),
      });
    }

    if (options.dateTo) {
      const to = new Date(options.dateTo);
      to.setHours(23, 59, 59, 999);
      qb.andWhere('event.createdAt <= :dateTo', { dateTo: to });
    }

    if (options.search) {
      qb.andWhere("event.payload::text ILIKE :search", {
        search: `%${options.search}%`,
      });
    }

    const [data, total] = await qb.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  async getStats() {
    const now = DateTime.now().setZone('America/Argentina/Buenos_Aires');
    const todayStart = now.startOf('day').toJSDate();
    const weekStart = now.startOf('week').toJSDate();
    const monthStart = now.startOf('month').toJSDate();

    const [
      totalUsers,
      loginsToday,
      loginsWeek,
      loginsMonth,
      searchesToday,
      searchesWeek,
      searchesMonth,
      totalEvents,
    ] = await Promise.all([
      this.userRepo.count(),
      this.eventRepo.count({
        where: { eventType: 'login', createdAt: Between(todayStart, nowAsDate()) as any },
      }),
      this.eventRepo.count({
        where: { eventType: 'login', createdAt: Between(weekStart, nowAsDate()) as any },
      }),
      this.eventRepo.count({
        where: { eventType: 'login', createdAt: Between(monthStart, nowAsDate()) as any },
      }),
      this.eventRepo.count({
        where: { eventType: 'search', createdAt: Between(todayStart, nowAsDate()) as any },
      }),
      this.eventRepo.count({
        where: { eventType: 'search', createdAt: Between(weekStart, nowAsDate()) as any },
      }),
      this.eventRepo.count({
        where: { eventType: 'search', createdAt: Between(monthStart, nowAsDate()) as any },
      }),
      this.eventRepo.count(),
    ]);

    return {
      totalUsers,
      totalEvents,
      logins: { today: loginsToday, week: loginsWeek, month: loginsMonth },
      searches: { today: searchesToday, week: searchesWeek, month: searchesMonth },
    };
  }

  async getTopSearches(limit = 10, period?: string, dateFrom?: string, dateTo?: string) {
    const { start, end } = this.getDateRange(period, dateFrom, dateTo);

    const qb = this.eventRepo
      .createQueryBuilder('event')
      .select("event.payload->>'query'", 'query')
      .addSelect('COUNT(*)', 'count')
      .where('event.eventType = :type', { type: 'search' })
      .andWhere("event.payload->>'query' IS NOT NULL");

    if (start) {
      qb.andWhere('event.createdAt >= :start', { start });
    }
    if (end) {
      qb.andWhere('event.createdAt <= :end', { end });
    }

    const result = await qb
      .groupBy("event.payload->>'query'")
      .orderBy('count', 'DESC')
      .limit(limit)
      .getRawMany();

    return result.map((r) => ({ query: r.query, count: parseInt(r.count) }));
  }

  async getUsersPaginated(options: {
    page?: number;
    limit?: number;
    search?: string;
  }) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(Math.max(1, options.limit || 20), 100);

    const qb = this.userRepo
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.email',
        'user.nombre',
        'user.apellido',
        'user.telefono',
        'user.rol',
      ])
      .orderBy('user.nombre', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    if (options.search) {
      qb.andWhere(
        '(LOWER(user.email) LIKE :s OR LOWER(user.nombre) LIKE :s OR LOWER(user.apellido) LIKE :s)',
        { s: `%${options.search.toLowerCase()}%` },
      );
    }

    const [data, total] = await qb.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return {
      data: data.map(({ password, ...u }) => u),
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  async getProductRanking(options: {
    order?: 'top' | 'bottom';
    limit?: number;
    period?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const rankLimit = Math.min(options.limit || 10, 50);
    const sortDir = options.order === 'bottom' ? 'ASC' : 'DESC';
    const { start, end } = this.getDateRange(options.period, options.dateFrom, options.dateTo);

    const params: any[] = [rankLimit];
    let dateFilter = '';
    let paramIdx = 2;

    if (start) {
      dateFilter += ` AND o."createdAt" >= $${paramIdx}`;
      params.push(start);
      paramIdx++;
    }
    if (end) {
      dateFilter += ` AND o."createdAt" <= $${paramIdx}`;
      params.push(end);
      paramIdx++;
    }

    const result = await this.orderRepo.query(
      `SELECT
         item->>'productName' AS "productName",
         (item->>'productId')::int AS "productId",
         SUM((item->>'quantity')::int) AS "totalSold",
         COUNT(DISTINCT o.id) AS "orderCount"
       FROM "order" o
       CROSS JOIN LATERAL jsonb_array_elements(o.items) AS item
       WHERE o.status != 'CANCELADO'
       ${dateFilter}
       GROUP BY item->>'productName', item->>'productId'
       ORDER BY "totalSold" ${sortDir}
       LIMIT $1`,
      params,
    );

    return result.map((r) => ({
      productId: parseInt(r.productId),
      productName: r.productName,
      totalSold: parseInt(r.totalSold),
      orderCount: parseInt(r.orderCount),
    }));
  }

  async getUserActivity(userId: string) {
    const lastLogin = await this.eventRepo.findOne({
      where: { userId, eventType: 'login' },
      order: { createdAt: 'DESC' },
    });

    const loginCount = await this.eventRepo.count({
      where: { userId, eventType: 'login' },
    });

    const searchCount = await this.eventRepo.count({
      where: { userId, eventType: 'search' },
    });

    return { lastLogin: lastLogin?.createdAt || null, loginCount, searchCount };
  }

  async getTopViewedProducts(limit = 10, period?: string, dateFrom?: string, dateTo?: string) {
    const { start, end } = this.getDateRange(period, dateFrom, dateTo);

    const qb = this.eventRepo
      .createQueryBuilder('event')
      .select("event.payload->>'productName'", 'productName')
      .addSelect("(event.payload->>'productId')::int", 'productId')
      .addSelect("event.payload->>'productSlug'", 'productSlug')
      .addSelect('COUNT(*)', 'views')
      .where('event.eventType = :type', { type: 'product_view' })
      .andWhere("event.payload->>'productId' IS NOT NULL");

    if (start) {
      qb.andWhere('event.createdAt >= :start', { start });
    }
    if (end) {
      qb.andWhere('event.createdAt <= :end', { end });
    }

    const result = await qb
      .groupBy("event.payload->>'productName'")
      .addGroupBy("event.payload->>'productId'")
      .addGroupBy("event.payload->>'productSlug'")
      .orderBy('views', 'DESC')
      .limit(limit)
      .getRawMany();

    return result.map((r) => ({
      productId: parseInt(r.productId),
      productName: r.productName,
      productSlug: r.productSlug,
      views: parseInt(r.views),
    }));
  }

  async getAnonymousSearches(limit = 10, period?: string, dateFrom?: string, dateTo?: string) {
    const { start, end } = this.getDateRange(period, dateFrom, dateTo);

    const qb = this.eventRepo
      .createQueryBuilder('event')
      .select("event.payload->>'query'", 'query')
      .addSelect('COUNT(*)', 'count')
      .where('event.eventType = :type', { type: 'search' })
      .andWhere('event.userId IS NULL')
      .andWhere("event.payload->>'query' IS NOT NULL");

    if (start) {
      qb.andWhere('event.createdAt >= :start', { start });
    }
    if (end) {
      qb.andWhere('event.createdAt <= :end', { end });
    }

    const result = await qb
      .groupBy("event.payload->>'query'")
      .orderBy('count', 'DESC')
      .limit(limit)
      .getRawMany();

    return result.map((r) => ({ query: r.query, count: parseInt(r.count) }));
  }

  async compareProductPeriods(options: {
    periodA: { dateFrom: string; dateTo: string };
    periodB: { dateFrom: string; dateTo: string };
    limit?: number;
  }) {
    const limit = Math.min(options.limit || 20, 50);

    const [periodA, periodB] = await Promise.all([
      this.getProductRanking({ order: 'top', limit, period: 'custom', dateFrom: options.periodA.dateFrom, dateTo: options.periodA.dateTo }),
      this.getProductRanking({ order: 'top', limit, period: 'custom', dateFrom: options.periodB.dateFrom, dateTo: options.periodB.dateTo }),
    ]);

    const productMap = new Map<number, {
      productId: number;
      productName: string;
      periodA: { totalSold: number; orderCount: number };
      periodB: { totalSold: number; orderCount: number };
      soldDiff: number;
      soldDiffPercent: number | null;
    }>();

    for (const p of periodA) {
      productMap.set(p.productId, {
        productId: p.productId,
        productName: p.productName,
        periodA: { totalSold: p.totalSold, orderCount: p.orderCount },
        periodB: { totalSold: 0, orderCount: 0 },
        soldDiff: 0,
        soldDiffPercent: null,
      });
    }

    for (const p of periodB) {
      const existing = productMap.get(p.productId);
      if (existing) {
        existing.periodB = { totalSold: p.totalSold, orderCount: p.orderCount };
      } else {
        productMap.set(p.productId, {
          productId: p.productId,
          productName: p.productName,
          periodA: { totalSold: 0, orderCount: 0 },
          periodB: { totalSold: p.totalSold, orderCount: p.orderCount },
          soldDiff: 0,
          soldDiffPercent: null,
        });
      }
    }

    const results = Array.from(productMap.values()).map((item) => {
      item.soldDiff = item.periodB.totalSold - item.periodA.totalSold;
      item.soldDiffPercent = item.periodA.totalSold > 0
        ? Math.round(((item.periodB.totalSold - item.periodA.totalSold) / item.periodA.totalSold) * 10000) / 100
        : null;
      return item;
    });

    results.sort((a, b) => Math.abs(b.soldDiff) - Math.abs(a.soldDiff));

    return {
      periodA: { from: options.periodA.dateFrom, to: options.periodA.dateTo },
      periodB: { from: options.periodB.dateFrom, to: options.periodB.dateTo },
      products: results,
    };
  }
}
