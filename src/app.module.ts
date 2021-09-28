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

@Global()
@Module({
  imports: [HttpModule],
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
