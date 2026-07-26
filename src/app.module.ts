import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { EmailModule } from './email/email.module';
import { FriendsModule } from './friends/friends.module';
import { GameModule } from './game/game.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    EmailModule,
    GameModule,
    AuthModule,
    FriendsModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
