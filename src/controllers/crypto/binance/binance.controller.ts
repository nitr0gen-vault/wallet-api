import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { Contract, getDefaultProvider, providers, utils } from "ethers";
import { BscscanProvider } from "@ethers-ancillary/bsc";
import { ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "../../../guards/auth.guard";
import { Key } from "../../../entities/key.entity";
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";

@ApiTags("Crypto / Binance")
@Controller("binance")
export class BinanceController {
  static contractAbiFragment = [
    {
      name: "balanceOf",
      type: "function",
      inputs: [
        {
          name: "_owner",
          type: "address",
        },
      ],
      outputs: [
        {
          name: "balance",
          type: "uint256",
        },
      ],
      constant: true,
      payable: false,
    },
  ];

  static defaultSupportedTestBEP20Tokens = [
    {
      name: "TestTokenV1",
      symbol: "ttv1",
      contract: "0xa058960b3e0767da72a1792ae6f94a0238c1a940",
      decimal: 18,
      network: "test",
    },
  ];
  static defaultSupportedBEP20Tokens = [
    {
      name: "Binance USD",
      symbol: "BUSD",
      contract: "0x4Fabb145d64652a948d72533023f6E7A623C7C53",
      decimal: 18,
      network: "main",
    },
    {
      name: "FTX Token",
      symbol: "FTT",
      contract: "0x50d1c9771902476076ecfc8b2a83ad6b9355a4c9",
      decimal: 18,
      network: "main",
    },
    {
      name: "Bitcoin BEP2",
      symbol: "BTCB",
      contract: "0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c",
      decimal: 18,
      network: "main",
    },
    {
      name: "TrueUSD",
      symbol: "TUSD",
      contract: "0x0000000000085d4780B73119b644AE5ecd22b376",
      decimal: 18,
      network: "main",
    },
    {
      name: "Nexo",
      symbol: "NEXO",
      contract: "0xb62132e35a6c13ee1ee0f84dc5d40bad8d815206",
      decimal: 18,
      network: "main",
    },
    {
      name: "Ankr",
      symbol: "ANKR",
      contract: "0x8290333cef9e6d528dd5618fb97a76f268f3edd4",
      decimal: 18,
      network: "main",
    },
    {
      name: "Trust Wallet Token",
      symbol: "TWT",
      contract: "0x4b0f1812e5df2a09796481ff14017e6005508003",
      decimal: 18,
      network: "main",
    },
  ];

  constructor(
    @InjectRepository(Key)
    private KeyRepository: Repository<Key>
  ) {}

  private getProvider(network: string): BscscanProvider {
    switch (network) {
      default:
      case "main":
        return new BscscanProvider("bsc-mainnet", process.env.BINANCESCAN);
      case "test":
        return new BscscanProvider("bsc-testnet", process.env.BINANCESCAN);
    }
  }

  @UseGuards(AuthGuard)
  @Get(":network/fee")
  async gas(@Param("network") network: string): Promise<BinanceGasPrice> {
    const provider = this.getProvider(network);
    const price = (await provider.getGasPrice()).toNumber();

    return {
      low: price,
      medium: Math.floor(price * 1.8), // 1.5 not good for transfer (must be some gas to size ratio)
      high: Math.floor(price * 2),
    };
  }

  @UseGuards(AuthGuard)
  @Post(":network/send")
  async sendToNetwork(
    @Param("network") network: string,
    @Body("hex") tx: string
  ): Promise<unknown> {
    const provider = this.getProvider(network);
    console.log(tx);

    try {
      const response = await provider.sendTransaction(tx);
      return response;
    } catch (e) {
      return e;
    }
  }

  @UseGuards(AuthGuard)
  @Get(":network/:address")
  async wallet(
    @Param("network") network: string,
    @Param("address") address: string
  ): Promise<{
    balance: number;
    txrefs: any[];
    nonce?: number;
  }> {
    const provider = this.getProvider(network);
    const balance = await provider.getBalance(address);
    //const history = await provider.getHistory(address);

    const response = {
      balance: parseInt(balance.toString()),
      //txrefs: [history],
      txrefs: [],
      nonce: await provider.getTransactionCount(address),
      tokens: [],
    };

    const wallet = await this.KeyRepository.find({ where: { address } });
    if (wallet.length && wallet[0].tokens) {
      for (let i = wallet[0].tokens.length; i--; ) {
        //const bep20 = BinanceController.defaultSupportedBEP20Tokens[i];
        const bep20 = wallet[0].tokens[i];
        if (bep20.network == network) {
          response.tokens.push({
            name: bep20.name,
            symbol: bep20.symbol,
            balance: await this.get20TokenBalance(
              bep20.contract,
              address,
              provider,
              bep20.decimal
            ),
            decimal: bep20.decimal,
            contract: bep20.contract,
            network: bep20.network,
          });
        }
      }
    }

    return response;
  }

  // TODO : Remove this repeated code
  @UseGuards(AuthGuard)
  @Get(":network/:address/tx")
  async walletTx(
    @Param("network") network: string,
    @Param("address") address: string
  ): Promise<{
    balance: number;
    txrefs: any[];
    nonce?: number;
  }> {
    const provider = this.getProvider(network);
    const balance = await provider.getBalance(address);
    const history = await provider.getHistory(address);

    const response = {
      balance: parseInt(balance.toString()),
      txrefs: history,
      //txrefs: [],
      nonce: await provider.getTransactionCount(address),
      tokens: [],
    };

    const wallet = await this.KeyRepository.find({ where: { address } });
    if (wallet.length && wallet[0].tokens) {
      for (let i = wallet[0].tokens.length; i--; ) {
        //const bep20 = BinanceController.defaultSupportedBEP20Tokens[i];
        const bep20 = wallet[0].tokens[i];
        if (bep20.network == network) {
          response.tokens.push({
            name: bep20.name,
            symbol: bep20.symbol,
            balance: await this.get20TokenBalance(
              bep20.contract,
              address,
              provider,
              bep20.decimal
            ),
            decimal: bep20.decimal,
            contract: bep20.contract,
            network: bep20.network,
          });
        }
      }
    }

    return response;
  }

  async get20TokenBalance(
    contractAddress: string,
    address: string,
    provider: providers.EtherscanProvider,
    decimals = 18
  ): Promise<number> {
    const contract = new Contract(
      contractAddress,
      BinanceController.contractAbiFragment,
      provider
    );

    try {
    const balance = await contract.balanceOf(address);
    return parseFloat(utils.formatUnits(balance, decimals));
    }catch(e) {
      return 0; // Need to handle that better!
    }
  }
}

interface BinanceGasPrice {
  low: number;
  medium: number;
  high: number;
}
