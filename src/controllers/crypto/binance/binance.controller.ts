import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import {
  Contract,
  getDefaultProvider,
  providers,
  utils,
  ContractFactory,
  BigNumber,
} from "ethers";
import { BscscanProvider } from "@ethers-ancillary/bsc";
import { ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "../../../guards/auth.guard";
import { Key } from "../../../entities/key.entity";
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import * as solc from "solc";
import { existsSync, fstat, readFileSync, writeFileSync } from "fs";
import { dirname } from "path";
//const flatten = require("truffle-flattener");

interface TransactContract extends providers.TransactionResponse {
  contractAddress?: string;
}

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
    //console.log(tx);

    try {
      const response = await provider.sendTransaction(tx);
      return response;
    } catch (e) {
      return e;
    }
  }

  @UseGuards(AuthGuard)
  @Post(":network/bep20/send")
  async sendContractToNetwork(
    @Param("network") network: string,
    @Body("hex") tx: string,
    @Body("source") sourceCode: any,
    @Body("name") contractname: string
  ): Promise<TransactContract> {
    const provider = this.getProvider(network);

    try {
      const response = (await provider.sendTransaction(tx)) as TransactContract;
      response.contractAddress = (await response.wait()).contractAddress;

      // Api contract verification fails on both codeformat types
      // Send to verify sync  to return
      // (async () => {
      //   const wait = await provider.waitForTransaction(response.hash);

      //   // Add More Time
      //   setTimeout(async () => {
      //     /*
      //     const verifyResponse = await provider.fetch(
      //       "contract",
      //       {
      //         action: "verifysourcecode",
      //         codeformat: "solidity-standard-json-input",
      //         compilerversion: "v0.8.10+commit.fc410830", // Get from solc?
      //         contractaddress: wait.contractAddress,
      //         optimizationUsed: 0,
      //         contractname: "ERC20.sol:ERC20",// + contractname,
      //         licenseType: 3,
      //         sourceCode: JSON.stringify(sourceCode), // Not needed but santity check
      //       },
      //       true
      //     );
      //     console.log(JSON.stringify(verifyResponse));
      //     */
      //   }, 5000);

      //   writeFileSync("./tmp3.3.json", JSON.stringify(sourceCode));
      //   // console.log({
      //   //   action: "verifysourcecode",
      //   //   codeformat: "solidity-standard-json-input",
      //   //   compilerversion: "v0.8.10+commit.fc410830", // Get from solc?
      //   //   contractaddress: wait.contractAddress,
      //   //   optimizationUsed: 0,
      //   //   contractname: "ERC20.sol:ERC20",
      //   //   licenseType: 3,
      //   //   sourceCode: sourceCode, // Not needed but santity check
      //   // });
      // })();

      return response;
    } catch (e) {
      return e;
    }
  }

  @UseGuards(AuthGuard)
  @Post(":network/bep20/create")
  async bep20Create(
    @Param("network") network: string,
    @Body("contract") contract: any
  ): Promise<unknown> {
    const contractBasePath = `${__dirname}/../solidity`;

    // Work out which base contract from settings
    // Must be a better solution possibly numerical, For now this is acceptable as it works and not oftern called
    let contractBaseType = "default.sol";

    if (contract.features.burnable) {
      contractBaseType = "burnable.sol";
    }

    if (contract.details.totalSupply) {
      contractBaseType = "capped.sol";
    }

    if (contract.features.burnable && contract.details.totalSupply) {
      contractBaseType = "burncap.sol";
    }

    if (contract.features.mintable) {
      contractBaseType = "mintable.sol";
    }

    if (contract.features.burnable && contract.features.mintable) {
      contractBaseType = "mintburn.sol";
    }

    if (contract.features.mintable && contract.details.totalSupply) {
      contractBaseType = "mintcap.sol";
    }

    if (
      contract.features.burnable &&
      contract.features.mintable &&
      contract.details.totalSupply
    ) {
      contractBaseType = "mintburncap.sol";
    }

    const contractBaseFile = readFileSync(
      `${contractBasePath}/${contractBaseType}`,
      "utf8"
    );

    // Create standard input-output JSON for solc
    var input = {
      language: "Solidity",
      sources: {
        [contractBaseType]: {
          content: contractBaseFile,
        },
      },
      settings: {
        optimizer: {
          enabled: true,
          runs: 200,
        },
        outputSelection: {
          "*": {
            "*": ["*"],
          },
        },
      },
    };

    const varifSource = {
      language: "Solidity",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200,
        },
      },
      sources: {
        [contractBaseType]: {
          content: contractBaseFile,
        },
      },
    };

    function findImports(path: string) {
      const origPath = path;
      if (path.startsWith("opts")) {
        path = `${contractBasePath}/${path}`;
      } else {
        // Openzeppelin
        let ozPath = dirname(
          require.resolve("@openzeppelin/contracts/package.json")
        );
        path = `${ozPath}/${path.replace("@openzeppelin/contracts", "")}`;
      }

      if (existsSync(path)) {
        const contents = readFileSync(path, "utf8");
        varifSource.sources[origPath] = { content: contents };
        return {
          contents,
        };
      }

      // What did we look for?
      console.log(path);
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
      source: varifSource, // So they can submit it
    };

    //writeFileSync("./tmp-source.json", JSON.stringify(varifSource));

    // `output` here contains the JSON output as specified in the documentation
    for (var contractName in output.contracts[contractBaseType]) {
      compiled.bytecode =
        output.contracts[contractBaseType][contractName].evm.bytecode.object;
      compiled.abi = output.contracts[contractBaseType][contractName].abi;
    }

    const factory = new ContractFactory(compiled.abi, compiled.bytecode);

    if (contract.details.totalSupply) {
      compiled.tx = factory.getDeployTransaction(
        contract.details.name,
        contract.details.symbol,
        contract.details.initialSupply,
        contract.details.decimal,
        contract.details.totalSupply
      );
    } else {
      compiled.tx = factory.getDeployTransaction(
        contract.details.name,
        contract.details.symbol,
        contract.details.initialSupply,
        contract.details.decimal
      );
    }
    return compiled;
  }

  // @UseGuards(AuthGuard)
  // @Post(":network/bep20/verify")
  // async bep20Send(
  //   @Param("network") network: string,
  //   @Body("contract") contract: any
  // ): Promise<unknown> {
  //   //const provider = this.getProvider(network);

  //   const response = await ActiveRequest.send(
  //     `https://api-testnet.bscscan.com/api`,
  //     "POST",
  //     [],
  //     {
  //       apikey: process.env.BINANCESCAN,
  //       module: "contract",
  //       action: "verifysourcecode",
  //       sourcecode
  //     }
  //   );

  //   if (response.data) {
  //     return response.data as object;
  //   } else {
  //     if (response.raw) {
  //       try {
  //         return JSON.parse(response.raw);
  //       } catch (e) {
  //         throw new Error("Failed to Parse");
  //       }
  //     }
  //   }

  //   //https://api-testnet.bscscan.com/api

  //   return true;
  // }

  @UseGuards(AuthGuard)
  @Get(":network/:address")
  async wallet(
    @Param("network") network: string,
    @Param("address") address: string
  ): Promise<{
    balance: number | string;
    partitions: any[];
    txrefs: any[];
    nonce?: number;
  }> {
    const provider = this.getProvider(network);
    //const balance = await provider.getBalance(address);

    const response = {
      balance: "0",
      //txrefs: [history],
      partitions: [],
      txrefs: [],
      nonce: await provider.getTransactionCount(address),
      tokens: [],
    };

    try {
      response.balance = await (await provider.getBalance(address)).toString();
    } catch (e) {
      // Rate limit hit I guess!
    }
    //const history = await provider.getHistory(address);

    // move to findone
    const wallet = await this.KeyRepository.find({ where: { address } });

    if (!response.balance && wallet[0].balance?._hex) {
      // Need to fix the BigNumber / BigNumber problems in data
      response.balance = BigNumber.from(wallet[0].balance._hex).toString();
    }

    if (wallet.length && wallet[0].tokens) {
      const currentWallet = wallet[0];

      for (let i = currentWallet.tokens.length; i--; ) {
        //const bep20 = BinanceController.defaultSupportedBEP20Tokens[i];
        const bep20 = currentWallet.tokens[i];
        bep20.balance = await this.get20TokenBalance(
          bep20.contract,
          address,
          provider,
          bep20.decimal
        );
        if (bep20.network == network) {
          response.tokens.push({
            name: bep20.name,
            symbol: bep20.symbol,
            balance: bep20.balance,
            decimal: bep20.decimal,
            contract: bep20.contract,
            network: bep20.network,
          });
        }
      }

      currentWallet.balance = BigNumber.from(response.balance);
      currentWallet.balanceUpdated = wallet[0].updated = new Date();

      //console.log(currentWallet);

      //also has partitioned as a bool
      if (
        currentWallet.partitions &&
        currentWallet.partitions[currentWallet.symbol]
      ) {
        response.partitions =
          currentWallet.partitions[currentWallet.symbol].subparts;
        if (currentWallet.partitioned) {
          // Use the sum as this wallet is partioned
          response.balance =
            currentWallet.partitions[currentWallet.symbol].value;
        } else {
          // This wallet isn't partioned so add the 2 together
          response.balance = currentWallet.balance
            .add(
              BigNumber.from(currentWallet.partitions[currentWallet.symbol].hex)
            )
            .toString();
        }
      }

      // Depending if partioned we need to modify the response balance
      // we will keep balance the live full value
      if (currentWallet.partitioned && currentWallet.partitions) {
        response.balance = currentWallet.partitions[currentWallet.symbol].value;
      }

      await this.KeyRepository.save(wallet[0]);
    }

    // Lets keep a record of this data

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
    //txrefs: any[];
    nonce?: number;
  }> {
    const provider = this.getProvider(network);

    const response = {
      balance: 0,
      //txrefs: history,
      //txrefs: [],
      nonce: await provider.getTransactionCount(address),
      tokens: [],
    };

    try {
      response.balance = parseInt(
        await (await provider.getBalance(address)).toString()
      );
      //const history = await provider.getHistory(address);
    } catch (e) {
      // Rate limit hit I guess!
    }

    const wallet = await this.KeyRepository.find({ where: { address } });

    if (!response.balance && wallet[0].balance?._hex) {
      // Need to fix the BigNumber / BigNumber problems in data
      response.balance = BigNumber.from(wallet[0].balance._hex).toNumber();
    }

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
    } catch (e) {
      return 0; // Need to handle that better!
    }
  }
}

interface BinanceGasPrice {
  low: number;
  medium: number;
  high: number;
}
