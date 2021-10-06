import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import * as tron from "tronweb";
import { utils } from "ethers";
import { AuthGuard } from "../../../guards/auth.guard";
import { InjectRepository } from "@nestjs/typeorm";
import { Key } from "../../../entities/key.entity";
import { Repository } from "typeorm";

@ApiTags("Crypto / Tron")
@Controller("tron")
export class TronController {
  static defaultSupportedTestTRC20Tokens = [
    {
      name: "JUST Stablecoin",
      symbol: "USDJ",
      contract: "TLBaRhANQoJFTqre9Nf1mjuwNWjCJeYqUL",
      decimal: 18,
      network: "niles",
    }
  ]
    static defaultSupportedTRC20Tokens = [
    {
      name: "Wrapped TRX",
      symbol: "WTRX",
      contract: "TNUC9Qb1rRpS5CbWLmNMxXBjyFoydXjWFR",
      decimal: 18,
      network: "main",
    },
    {
      name: "Wrapped BTT",
      symbol: "WBTT",
      contract: "TKfjV9RNKJJCqPvBtK8L7Knykh7DNWvnYt",
      decimal: 18,
      network: "main",
    },
    {
      name: "Wrapped BTC",
      symbol: "WBTC",
      contract: "TXpw8XeWYeTUd4quDskoUqeQPowRh4jY65",
      decimal: 18,
      network: "main",
    },
    {
      name: "USD Coin",
      symbol: "USDC",
      contract: "TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8",
      decimal: 18,
      network: "main",
    },
    {
      name: "Tether",
      symbol: "USDT",
      contract: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
      decimal: 18,
      network: "main",
    },
    {
      name: "JUST Stablecoin",
      symbol: "USDJ",
      contract: "TMwFHYXLJaRUPeW6421aqXL4ZEzPRFGkGT",
      decimal: 18,
      network: "main",
    },
  ];

  constructor(
    @InjectRepository(Key)
    private KeyRepository: Repository<Key>
  ) {}

  private getTron(network: string, owner?: string): tron {
    let tronWeb;
    switch (network) {
      default:
      case "main":
        throw Error("Not Implemented");
      case "shasta":
        tronWeb = new tron({
          fullNode: "https://api.shasta.trongrid.io",
          solidityNode: "https://api.shasta.trongrid.io",
          eventServer: "https://api.shasta.trongrid.io",
        });
        break;
      case "niles":
        tronWeb = new tron({
          fullNode: "https://nile.trongrid.io/",
          solidityNode: "https://api.nileex.io/walletsolidity/",
          eventServer: "https://nile.trongrid.io/",
        });
        break;
    }

    if (owner) {
      tronWeb.setAddress(owner);
    }

    return tronWeb;
  }

  @UseGuards(AuthGuard)
  @Post(":network/create")
  async fee(
    @Param("network") network: string,
    @Body("to") to: string,
    @Body("from") from: string,
    @Body("amount") amount: number
  ): Promise<any> {
    const tronWeb = this.getTron(network);
    return await tronWeb.transactionBuilder.sendTrx(to, amount, from);
  }

  @UseGuards(AuthGuard)
  @Post(":network/create/trc20")
  async trc20(
    @Param("network") network: string,
    @Body("to") to: string,
    @Body("from") from: string,
    @Body("amount") amount: number,
    @Body("contract") contractAddress: number
  ): Promise<any> {
    const tronWeb = this.getTron(network, from);

    const tx = await tronWeb.transactionBuilder.triggerSmartContract(
      contractAddress,
      "transfer(address,uint256)",
      {
        feeLimit: 40000000, // they used this
        callValue: 0,
      },
      [
        {
          type: "address",
          value: to,
        },
        {
          type: "uint256",
          value: amount,
        },
      ]
    );

    return tx.transaction;
  }

  @UseGuards(AuthGuard)
  @Post(":network/send")
  //@Permissions('create:items')
  async sendToNetwork(
    @Param("network") network: string,
    @Body("hex") tx: string
  ): Promise<unknown> {
    const tronWeb = this.getTron(network);
    return tronWeb.trx.sendRawTransaction(tx);
  }

  @UseGuards(AuthGuard)
  @Get(":network/:address")
  async wallet(
    @Param("network") network: string,
    @Param("address") address: string
  ): Promise<TronAddress> {
    const tronWeb = this.getTron(network, address);

    // Need to work out how this address is stored in the contract
    // it isn't hex or base58 no idea but we can extract it from tronscan!
    const whoami = await tronWeb.fullNode.request(`/v1/accounts/${address}`);

    if (whoami?.data.length) {
      const account = whoami.data[0];
      // const allTransactions = await tronWeb.fullNode.request(
      //   `/v1/accounts/${address}/transactions`
      // );

      const response = {
        balance: account.balance,
        txrefs: [],
        whoami: account.address,
        tokens: [],
      };

      const wallet = await this.KeyRepository.find({ where: { address } });
      if (wallet.length) {
        for (let i = wallet[0].tokens.length; i--; ) {
          //const trc20 = TronController.defaultSupportedTRC20Tokens[i];
          const trc20 = wallet[0].tokens[i];
          if (trc20.network == network) {
            response.tokens.push({
              name: trc20.name,
              symbol: trc20.symbol,
              balance: await this.get20TokenBalance(
                trc20.contract,
                address,
                trc20.decimal,
                tronWeb
              ),
              decimal: trc20.decimal,
              contract: trc20.contract,
              network: trc20.network,
            });
          }
        }
      }

      return response;
    } else {
      const tokens = [];
      return {
        balance: 0,
        txrefs: [],
        whoami: "",
        tokens,
      };

      //throw Error('Unknown Account');
    }
  }

  async get20TokenBalance(
    contractAddress: string,
    address: string,
    decimals: number,
    tronWeb: any
  ): Promise<number> {
    let contract = await tronWeb.contract().at(contractAddress);
    //Use call to execute a pure or view smart contract method.
    // These methods do not modify the blockchain, do not cost anything to execute and are also not broadcasted to the network.
    let balance = await contract.balanceOf(address).call();

    return parseFloat(utils.formatUnits(balance, decimals));

    // Gets Transactions
    // return await tronWeb.fullNode.request(
    //   `/v1/accounts/${address}/transactions/trc20?contract_address=${contractAddress}`,
    // );

    //return parseFloat(utils.formatUnits(balance, decimals));
  }
}

interface TronAddress {
  balance: number;
  whoami: any;
  txrefs: TronAddressTxRef[];
  tokens: any[];
}

interface TronAddressTxRef {}
