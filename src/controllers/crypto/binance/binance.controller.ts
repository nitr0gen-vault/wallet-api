import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { Contract, getDefaultProvider, providers, utils } from "ethers";
import { BscscanProvider } from "@ethers-ancillary/bsc";
import { ApiTags } from "@nestjs/swagger";
import { AuthGuard } from '../../../guards/auth.guard';

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

  static supportedBEP20Tokens = [
    {
      name: "TestTokenV1",
      symbol: "ttv1",
      contract: "0xa058960b3e0767da72a1792ae6f94a0238c1a940",
      decimals: 18,
      network: "test",
    },
    {
      name: "Binance USD",
      symbol: "BUSD",
      contract: "0x4Fabb145d64652a948d72533023f6E7A623C7C53",
      decimals: 18,
      network: "main",
    },
    {
      name: "FTX Token",
      symbol: "FTT",
      contract: "0x50d1c9771902476076ecfc8b2a83ad6b9355a4c9",
      decimals: 18,
      network: "main",
    },
    {
      name: "Bitcoin BEP2",
      symbol: "BTCB",
      contract: "0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c",
      decimals: 18,
      network: "main",
    },
    {
      name: "TrueUSD",
      symbol: "TUSD",
      contract: "0x0000000000085d4780B73119b644AE5ecd22b376",
      decimals: 18,
      network: "main",
    },
    {
      name: "Nexo",
      symbol: "NEXO",
      contract: "0xb62132e35a6c13ee1ee0f84dc5d40bad8d815206",
      decimals: 18,
      network: "main",
    },
    {
      name: "Ankr",
      symbol: "ANKR",
      contract: "0x8290333cef9e6d528dd5618fb97a76f268f3edd4",
      decimals: 18,
      network: "main",
    },
    {
      name: "Trust Wallet Token",
      symbol: "TWT",
      contract: "0x4b0f1812e5df2a09796481ff14017e6005508003",
      decimals: 18,
      network: "main",
    },
  ];

  private getProvider(network: string): BscscanProvider {
    switch (network) {
      default:
      case "main":
        return new BscscanProvider(
          "bsc-mainnet",
          "1WHSJ9YY13XZ9ESWJK7PFGA8QN33NJ2XVM"
        );
      case "test":
        return new BscscanProvider(
          "bsc-testnet",
          "1WHSJ9YY13XZ9ESWJK7PFGA8QN33NJ2XVM"
        );
    }
    // const provider = new providers.JsonRpcProvider(
    //   'https://data-seed-pre-0-s1.binance.org:80',
    //   { name: 'binance', chainId: 97 },
    // );
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
    const history = await provider.getHistory(address);

    const response = {
      balance: parseInt(balance.toString()),
      txrefs: [history],
      nonce: await provider.getTransactionCount(address),
      tokens: [],
    };

    for (let i = BinanceController.supportedBEP20Tokens.length; i--; ) {
      const bep20 = BinanceController.supportedBEP20Tokens[i];
      if (bep20.network == network) {
        response.tokens.push({
          name: bep20.name,
          symbol: bep20.symbol,
          balance: await this.get20TokenBalance(
            bep20.contract,
            address,
            provider,
            bep20.decimals
          ),
          decimals: bep20.decimals,
          address: bep20.contract,
          type: "bep20",
        });
      } else {
        // Lets return 0 for now
        response.tokens.push({
          name: bep20.name,
          symbol: bep20.symbol,
          balance: 0,
          decimals: bep20.decimals,
          address: bep20.contract,
          type: "bep20",
        });
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

    const balance = await contract.balanceOf(address);
    return parseFloat(utils.formatUnits(balance, decimals));
  }
}

interface BinanceGasPrice {
  low: number;
  medium: number;
  high: number;
}
