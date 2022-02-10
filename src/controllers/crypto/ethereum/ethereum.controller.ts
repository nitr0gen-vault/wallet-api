import { Body, Controller, Post, UseGuards, Get, Param } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { InjectRepository } from "@nestjs/typeorm";
import { BigNumber, Contract, ContractFactory, providers, utils } from "ethers";
import { Key, Token } from "../../../entities/key.entity";
import { Repository } from "typeorm";
import { AuthGuard } from "../../../guards/auth.guard";
import * as solc from "solc";
import { existsSync, fstat, readFileSync, writeFileSync } from "fs";

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
  @Post(":network/erc20/send")
  async sendContractToNetwork(
    @Param("network") network: string,
    @Body("hex") tx: string,
    @Body("source") sourceCode: any,
    @Body("name") contractname: string
  ): Promise<unknown> {
    const provider = this.getProvider(network);

    try {
      const response = await provider.sendTransaction(tx);

      // Send to verify sync  to return
      (async () => {
        const wait = await provider.waitForTransaction(response.hash);

        // Add More Time
        setTimeout(async () => {
          const verifyResponse = await provider.fetch(
            "contract",
            {
              action: "verifysourcecode",
              codeformat: "solidity-standard-json-input",
              compilerversion: "v0.8.10+commit.fc410830", // Get from solc?
              contractaddress: wait.contractAddress,
              optimizationUsed: 0,
              contractname: "erc20.sol:" + contractname,
              licenseType: 3,
              sourceCode: JSON.stringify(sourceCode), // Not needed but santity check
            },
            true
          );
          console.log(JSON.stringify(verifyResponse));
        }, 5000);

        // writeFileSync("./tmp3.3.json", JSON.stringify(sourceCode));
        // console.log({
        //   action: "verifysourcecode",
        //   codeformat: "solidity-standard-json-input",
        //   compilerversion: "v0.8.10+commit.fc410830", // Get from solc?
        //   contractaddress: wait.contractAddress,
        //   optimizationUsed: 0,
        //   contractname: "ERC20.sol:ERC20",
        //   licenseType: 3,
        //   sourceCode: sourceCode, // Not needed but santity check
        // });
      })();

      return response;
    } catch (e) {
      return e;
    }
  }

  @UseGuards(AuthGuard)
  @Post(":network/erc20/create")
  async bep20Create(
    @Param("network") network: string,
    @Body("contract") contract: any
  ): Promise<unknown> {
    const contractPath = `${__dirname}/../../../openzeppelin/token/ERC20`;
    const erc20source = readFileSync(`${contractPath}/ERC20.sol`, "utf8");
    var input = {
      language: "Solidity",
      sources: {
        "ERC20.sol": {
          content: erc20source,
        },
      },
      settings: {
        outputSelection: {
          "*": {
            "*": ["*"],
          },
        },
      },
    };

    const varifSource = {
      language: "Solidity",
      sources: {
        "ERC20.sol": {
          content: erc20source,
        },
      },
    };

    function findImports(path) {
      if (existsSync(`${contractPath}/${path}`)) {
        const contents = readFileSync(`${contractPath}/${path}`, "utf8");
        varifSource.sources[path] = { content: contents };
        return {
          contents,
        };
      }

      if (existsSync(`${contractPath}/../../${path}`)) {
        const contents = readFileSync(`${contractPath}/../../${path}`, "utf8");
        varifSource.sources[path] = { content: contents };
        return {
          contents,
        };
      }

      return { error: "File not found" };
    }

    // New syntax (supported from 0.5.12, mandatory from 0.6.0)
    var output = JSON.parse(
      solc.compile(JSON.stringify(input), { import: findImports })
    );

    const compiled = {
      bytecode: null,
      abi: null,
      tx: null,
      source: varifSource,
    };

    // `output` here contains the JSON output as specified in the documentation
    for (var contractName in output.contracts["ERC20.sol"]) {
      compiled.bytecode =
        output.contracts["ERC20.sol"][contractName].evm.bytecode.object;
      compiled.abi = output.contracts["ERC20.sol"][contractName].abi;
    }

    // writeFileSync("./tmp2", JSON.stringify(output));
    // writeFileSync("./tmp", JSON.stringify(varifSource));
    // writeFileSync("./tmp3", JSON.stringify(input));

    const initAsString = contract.details.initialSupply.toString();

    const factory = new ContractFactory(compiled.abi, compiled.bytecode);
    compiled.tx = factory.getDeployTransaction(
      contract.details.name,
      contract.details.symbol,
      contract.details.decimal,
      BigNumber.from(
        initAsString.padEnd(initAsString.length + 18, "0")
      ).toHexString()
    );

    return compiled;
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

    const response = {
      balance: 0,
      //txrefs: [history],
      txrefs: [],
      nonce: await provider.getTransactionCount(address),
      tokens: [] as Token[],
    };

    try {
      response.balance = parseInt(
        await (await provider.getBalance(address)).toString()
      );
    } catch (e) {
      // Rate limit hit I guess!
    }
    //const history = await provider.getHistory(address);

    const wallet = await this.KeyRepository.find({ where: { address } });

    if (!response.balance && wallet[0].balance?._hex) {
      // Need to fix the BigNumber / BigNumber problems in data
      response.balance = BigNumber.from(wallet[0].balance._hex).toNumber();
    }

    if (wallet.length && wallet[0].tokens) {
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
    try {
      const contract = new Contract(
        contractAddress,
        EthereumController.contractAbiFragment,
        provider
      );

      const balance = await contract.balanceOf(address);
      return parseFloat(utils.formatUnits(balance, decimals));
    } catch (e) {
      // Should take from the database but this will also change with partitions!
      // Ultimetly I think we should check balances in the background (or use difference keys)
      return 0;
    }
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
