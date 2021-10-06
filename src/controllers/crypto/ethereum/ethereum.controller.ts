import { Body, Controller, Post, UseGuards, Get, Param } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { InjectRepository } from "@nestjs/typeorm";
import { Contract, providers, utils } from "ethers";
import { Key, Token } from "../../../entities/key.entity";
import { Repository } from "typeorm";
import { AuthGuard } from "../../../guards/auth.guard";

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

  static defaultSupportedTestERC20Tokens = [
    {
      name: "TestTokenV1",
      symbol: "ettv1",
      contract: "0xa058960b3e0767da72a1792ae6f94a0238c1a940",
      decimal: 18,
      network: "test",
    },
  ];
  static defaultSupportedERC20Tokens = [
    {
      name: "Dai",
      symbol: "DAI",
      contract: "0x6b175474e89094c44da98b954eedeac495271d0f",
      decimal: 18,
      network: "main",
    },
    {
      name: "Wrapped Bitcoin",
      symbol: "WBTC",
      contract: "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599",
      decimal: 18,
      network: "main",
    },
    {
      name: "Chainlink",
      symbol: "LINK",
      contract: "0x514910771af9ca656af840dff83e8264ecf986ca",
      decimal: 18,
      network: "main",
    },
    {
      name: "Uniswap",
      symbol: "UNI",
      contract: "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984",
      decimal: 18,
      network: "main",
    },
    {
      name: "USD Coin",
      symbol: "USDC",
      contract: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      decimal: 18,
      network: "main",
    },
    {
      name: "Tether",
      symbol: "USDT",
      contract: "0xdac17f958d2ee523a2206206994597c13d831ec7",
      decimal: 18,
      network: "main",
    },
  ];

  constructor(
    @InjectRepository(Key)
    private KeyRepository: Repository<Key>
  ) {}

  private getProvider(network: string): providers.EtherscanProvider {
    switch (network) {
      default:
      case "main":
        return new providers.EtherscanProvider(
          "homestead",
          process.env.ETHERSCAN
        );
      case "test":
        return new providers.EtherscanProvider(
          "ropsten",
          process.env.ETHERSCAN
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
    //const history = await provider.getHistory(address);

    const response = {
      balance: parseInt(balance.toString()),
      //txrefs: [history],
      txrefs: [],
      nonce: await provider.getTransactionCount(address),
      tokens: [] as Token[],
    };

    const wallet = await this.KeyRepository.find({ where: { address } });
    console.log(wallet);
    if (wallet.length) {
      for (let i = wallet[0].tokens.length; i--; ) {
        //const erc20 = EthereumController.defaultSupportedTestERC20Tokens[i];
        const erc20 = wallet[0].tokens[i];
        if (erc20.network == network) {
          response.tokens.push({
            name: erc20.name,
            symbol: erc20.symbol,
            balance: await this.get20TokenBalance(
              erc20.contract,
              address,
              provider,
              erc20.decimal
            ),
            decimal: erc20.decimal,
            contract: erc20.contract,
            network: erc20.network,
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
