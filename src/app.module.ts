import { Global, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { HttpModule } from "@nestjs/axios";
import { OtkController } from "./controllers/external/user/otk.controller";
import { BitcoinController } from "./controllers/crypto/bitcoin/bitcoin.controller";
import { EthereumController } from "./controllers/crypto/ethereum/ethereum.controller";
import { WalletController } from "./controllers/wallet/wallet.controller";
import { Nitr0genService } from "./services/notabox/nitr0gen.service";
import { BinanceController } from "./controllers/crypto/binance/binance.controller";
import { TronController } from "./controllers/crypto/tron/tron.controller";
import { User } from "./entities/user.entity";
import { Key } from "./entities/key.entity";

@Global()
@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forRootAsync({
      useFactory: async () => {
        return {
          type: "mongodb",
          url: process.env.MONGODB_CONNECTION_STRING,
          database: process.env.MONGODB_DATABASE,
          entities: [__dirname + "/**/*.entity{.ts,.js}"],
          synchronize: true,
        };
      },
    }),
    TypeOrmModule.forFeature([User, Key]),
  ],
  controllers: [
    OtkController,
    BitcoinController,
    BinanceController,
    EthereumController,
    TronController,
    WalletController,
  ],
  providers: [Nitr0genService],
})
export class AppModule {}
