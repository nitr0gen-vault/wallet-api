import { Body, Controller, Post, UseGuards, Get, Param } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Contract, providers, utils } from "ethers";
import { AuthGuard } from '../../../guards/auth.guard';

@ApiTags("Crypto / Etheruem")
@Controller("ethereum")
export class EthereumController {
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

  static supportedERC20Tokens = [
    {
      name: "TestTokenV1",
      symbol: "ettv1",
      contract: "0xa058960b3e0767da72a1792ae6f94a0238c1a940",
      decimals: 18,
      network: "test",
    },
    {
      name: "Dai",
      symbol: "DAI",
      contract: "0x6b175474e89094c44da98b954eedeac495271d0f",
      decimals: 18,
      network: "main",
    },
    {
      name: "Wrapped Bitcoin",
      symbol: "WBTC",
      contract: "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599",
      decimals: 18,
      network: "main",
    },
    {
      name: "Chainlink",
      symbol: "LINK",
      contract: "0x514910771af9ca656af840dff83e8264ecf986ca",
      decimals: 18,
      network: "main",
    },
    {
      name: "Uniswap",
      symbol: "UNI",
      contract: "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984",
      decimals: 18,
      network: "main",
    },
    {
      name: "USD Coin",
      symbol: "USDC",
      contract: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      decimals: 18,
      network: "main",
    },
    {
      name: "Tether",
      symbol: "USDT",
      contract: "0xdac17f958d2ee523a2206206994597c13d831ec7",
      decimals: 18,
      network: "main",
    },
  ];

  private getProvider(network: string): providers.EtherscanProvider {
    switch (network) {
      default:
      case "main":
        return new providers.EtherscanProvider(
          "homestead",
          "R6BJBUE5TX9WNR4X5BSRZCGA3BID3EUDBY"
        );
      case "test":
        return new providers.EtherscanProvider(
          "ropsten",
          "R6BJBUE5TX9WNR4X5BSRZCGA3BID3EUDBY"
        );
    }
  }

  @UseGuards(AuthGuard)
  @Get(":network/fee")
  async fee(@Param("network") network: string): Promise<EthereumGasPrice> {
    const provider = this.getProvider(network);
    const price = (await provider.getGasPrice()).toNumber();

    return {
      low: price,
      medium: Math.floor(price * 1.5),
      high: Math.floor(price * 1.8),
    };
  }

  @UseGuards(AuthGuard)
  @Post(":network/send")
  //@Permissions('create:items')
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
    @Param("network") network: "main" | "test",
    @Param("address") address: string
  ): Promise<EthereumAddress> {
    const provider = this.getProvider(network);
    const balance = await provider.getBalance(address);
    const history = await provider.getHistory(address);

    const response = {
      balance: parseInt(balance.toString()),
      txrefs: [history],
      nonce: await provider.getTransactionCount(address),
      tokens: [],
    };

    for (let i = EthereumController.supportedERC20Tokens.length; i--; ) {
      const erc20 = EthereumController.supportedERC20Tokens[i];
      if (erc20.network == network) {
        response.tokens.push({
          name: erc20.name,
          symbol: erc20.symbol,
          balance: await this.get20TokenBalance(
            erc20.contract,
            address,
            provider,
            erc20.decimals
          ),
          decimals: erc20.decimals,
          address: erc20.contract,
          type: "erc20",
        });
      } else {
        // Lets return 0 for now
        response.tokens.push({
          name: erc20.name,
          symbol: erc20.symbol,
          balance: 0,
          decimals: erc20.decimals,
          address: erc20.contract,
          type: "erc20",
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
      EthereumController.contractAbiFragment,
      provider
    );

    const balance = await contract.balanceOf(address);
    return parseFloat(utils.formatUnits(balance, decimals));
  }
}

interface EthereumAddress {
  balance: number;
  nonce: number;
  txrefs: providers.TransactionResponse[][];
  tokens?: any;
}

interface EthereumAddressTxRef {}

interface EthereumGasPrice {
  low: number;
  medium: number;
  high: number;
}
