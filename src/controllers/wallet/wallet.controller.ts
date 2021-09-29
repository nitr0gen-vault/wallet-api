import {
  Controller,
  Get,
  Request,
  Post,
  Body,
  UseGuards,
} from "@nestjs/common";
import { Nitr0genService } from "../../services/notabox/nitr0gen.service";
import { ApiTags } from "@nestjs/swagger";
import { InjectRepository } from "@nestjs/typeorm";
import { Key } from "../../entities/key.entity";
import { Repository } from "typeorm";
import { AuthGuard } from "../../guards/auth.guard";

@ApiTags("Wallet")
@Controller("wallet")
export class WalletController {
  constructor(
    @InjectRepository(Key)
    private KeyRepository: Repository<Key>,
    private ntx: Nitr0genService
  ) {}

  @UseGuards(AuthGuard)
  @Post()
  //@Permissions('appy:create:users')
  async add(
    @Body("key")
    keyData: {
      symbol: string;
      nId: string;
    },
    @Body("ntx") ntx: object,
    @Request() req: any
  ): Promise<{
    key: any;
    hashes: string[];
  }> {
    // Generate New
    const response = await this.ntx.keyCreate(keyData.symbol, keyData.nId, ntx);

    // Build & Save key object
    const key = new Key();
    key.symbol = keyData.symbol;
    key.nId = response.nId;
    key.address = response.address;
    key.created = key.updated = new Date();
    key.userId = req.user.id;
    await this.KeyRepository.insert(key);

    return {
      key: {
        symbol: keyData.symbol,
        nId: response.nId,
        address: response.address,
      },
      hashes: response.hashes,
    };
  }

  @Post("preflight")
  @UseGuards(AuthGuard)
  async preflight(@Body("ntx") ntx: object): Promise<any> {
    return await this.ntx.passthrough("keys/preflight", ntx);
  }

  @Post("sign")
  @UseGuards(AuthGuard)
  async sign(@Body("ntx") ntx: object): Promise<any> {
    return await this.ntx.passthrough("keys/sign", ntx);
  }

  @Post("diffconsensus")
  @UseGuards(AuthGuard)
  async diffConsens(@Body("ntx") ntx: object): Promise<any> {
    return await this.ntx.passthrough("keys/diffconsensus", ntx);
  }
}
