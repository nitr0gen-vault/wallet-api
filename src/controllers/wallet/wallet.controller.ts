import {
  Controller,
  Get,
  Request,
  Post,
  Body,
  UseGuards,
} from "@nestjs/common";
import { Nitr0genService } from "../../services/nitr0gen/nitr0gen.service";
import { ApiTags } from "@nestjs/swagger";
import { InjectRepository } from "@nestjs/typeorm";
import { Key, Token } from "../../entities/key.entity";
import { Repository } from "typeorm";
import { AuthGuard } from "../../guards/auth.guard";
import { Wallet } from "@ethersproject/wallet";
import { User } from "../../entities/user.entity";
import { EthereumController } from "../crypto/ethereum/ethereum.controller";
import { BinanceController } from "../crypto/binance/binance.controller";
import { TronController } from "../crypto/tron/tron.controller";

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
  @Post("internal")
  async internal(
    @Body("address") address: string,
    @Body("symbol") symbol: string,
  ): Promise<boolean> {
    let internal = await this.KeyRepository.find({
      where: { symbol, address },
    });

    if(internal.length) {
      return true;
    }else{
      throw Error("Unknown address");
    }

  }

  @UseGuards(AuthGuard)
  @Post("open")
  async open(
    @Body("symbol") symbol: string,
    @Request() req: any
  ): Promise<any> {
    // Simulate no open keys fallback
    // if (symbol === "ropsten") {
    //   throw Error("No Open Keys");
    // }

    let open = await this.KeyRepository.find({
      where: { symbol: symbol, userId: undefined },
    });

    if (open.length) {
      // Reserve random from collision
      const key = open[(open.length * Math.random()) | 0];
      key.userId = req.user.id;
      await this.KeyRepository.save(key);

      return {
        symbol,
        nId: key.nId,
        address: key.address,
        hashes: key.hashes,
        nonce: 0,
        chainId: key.chainId,
        tokens: key.tokens,
      };
    }
    throw Error("No Open Keys");
  }

  @UseGuards(AuthGuard)
  @Post("close")
  async close(
    @Body("nId") nId: string,
    @Body("ntx") ntx: object,
    @Request() req: any
  ): Promise<any> {
    let results = await this.KeyRepository.find({
      where: { nId, userId: req.user.id },
    });

    if (results.length) {
      // Reserve random from collision
      //const key = results[0];

      // So we know they are the reserved owner (or already attached!)
      // Just need to forward the ntx so the ledger knows

      // key/diffcon will be updated they do the same thing though
      return await this.ntx.passthrough("keys/diffconsensus", ntx);
    }
    throw Error("Invalid close claim");
  }

  @UseGuards(AuthGuard)
  @Post()
  async add(
    @Body("key")
    keyData: {
      symbol: string;
      nId: string;
      seeded: boolean;
    },
    @Body("ntx") ntx: object,
    @Request() req: any
  ): Promise<{
    key: any;
    tokens: Token[];
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
    if (!keyData.seeded) {
      key.userId = req.user.id;
    }
    key.hashes = response.hashes;

    switch (key.symbol) {
      case "eth":
        key.chainId = 1;
        key.tokens = EthereumController.defaultSupportedERC20Tokens;
        break;
      case "ropsten":
        key.chainId = 3;
        key.tokens = EthereumController.defaultSupportedTestERC20Tokens;
        break;
      case "tbnb":
        key.chainId = 97;
        key.tokens = BinanceController.defaultSupportedTestBEP20Tokens;
        break;
      case "bnb":
        key.chainId = 56;
        key.tokens = BinanceController.defaultSupportedBEP20Tokens;
        break;
      case "trx":
      case "tron":
        key.tokens = TronController.defaultSupportedTRC20Tokens;
        break;
      case "niles":
        key.tokens = TronController.defaultSupportedTestTRC20Tokens;
        break;
      default:
        key.tokens = [];
        break;
    }

    await this.KeyRepository.insert(key);
    return {
      key: {
        symbol: keyData.symbol,
        nId: response.nId,
        address: response.address,
        chainId: key.chainId,
      },
      tokens: key.tokens,
      hashes: response.hashes,
    };
  }

  @UseGuards(AuthGuard)
  @Post("token")
  //@Permissions('appy:create:users')
  async addToken(
    @Body("token")
    tokenData: {
      symbol: string;
      name: string;
      decimal: number;
      address: string;
    },
    @Body("key") key: string,
    @Request() req: any
  ): Promise<Token> {
    // Generate New
    const keys = await this.KeyRepository.find({ where: { address: key } });

    if (keys.length) {
      const keyData = keys[0];
      // Test or main
      let network;
      switch (keyData.symbol) {
        case "tbnb":
        case "ropsten":
        case "niles":
          network = "test";
          break;
        default:
          network = "main";
      }

      const token: Token = {
        name: tokenData.name,
        symbol: tokenData.symbol,
        decimal: tokenData.decimal,
        contract: tokenData.address,
        network,
      };
      keyData.tokens.push(token);
      await this.KeyRepository.save(keyData);
      return token;
    }
    throw new Error("Token not added");
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
