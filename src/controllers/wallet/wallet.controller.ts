import { Controller, Get, Request, Post, Body } from "@nestjs/common";
import { Nitr0genService } from "../../services/notabox/nitr0gen.service";
import { ApiTags } from "@nestjs/swagger";

@ApiTags("Wallet")
@Controller("wallet")
export class WalletController {
  constructor(private ntx: Nitr0genService) {}

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
    const response = await this.ntx.keyCreate(
      keyData.symbol,
      keyData.nId,
      ntx
    );

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
  async preflight(@Body("ntx") ntx: object): Promise<any> {
    return await this.ntx.passthrough("keys/preflight", ntx);
  }

  @Post("sign")
  async sign(@Body("ntx") ntx: object): Promise<any> {
    return await this.ntx.passthrough("keys/sign", ntx);
  }

  @Post("diffconsensus")
  async diffConsens(@Body("ntx") ntx: object): Promise<any> {
    return await this.ntx.passthrough("keys/diffconsensus", ntx);
  }
}
