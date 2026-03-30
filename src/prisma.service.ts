import { Injectable } from '@nestjs/common';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from 'generated/prisma/client';
import { Logger } from '@nestjs/common';

@Injectable()
export class PrismaService extends PrismaClient {
    private readonly logger = new Logger(PrismaService.name);
    constructor() {
        const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL as string });
        super({ adapter });
    }

    onModuleInit() {
        this.logger.log('PrismaService initialized');
    }
}