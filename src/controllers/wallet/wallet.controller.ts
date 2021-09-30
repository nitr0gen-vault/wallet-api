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
import { Wallet } from "@ethersproject/wallet";
import { User } from "../../entities/user.entity";

@ApiTags("Wallet")
@Controller("wallet")
export class WalletController {
  constructor(
    @InjectRepository(Key)
    private KeyRepository: Repository<Key>,
    @InjectRepository(User)
    private UserRepository: Repository<User>,
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

  @UseGuards(AuthGuard)
  @Post("cache")
  //@Permissions('appy:create:users')
  async cache(
    @Body("uuid") uuid: object
  ): Promise<{ keys: Key[]; settings: any }> {

    // TODO Improve security, When doing preflights monitor and match on uuid or provide otk signature
    // without that the user settings/public wallet can be exposed from brute forcing uuids
    // There is 2 types of wallet profile moving this done via social recovery and otpk pending

    // Find User
    const users = await this.UserRepository.find({ where: { uuid } });

    if (users.length) {
      const user = users[0];
      // Get keys from his id
      const keys = await this.KeyRepository.find({
        where: { userId: user.id },
      });
      return {
        keys,
        settings: {
          security: user.security,
          email: user.email,
          recovery: user.recovery,
          telephone: user.telephone,
        },
      };
    } else {
      return {
        keys: [],
        settings: [],
      };
    }
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
