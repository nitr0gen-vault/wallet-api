import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiTags } from "@nestjs/swagger";
import * as tron from "tronweb";
import { utils } from "ethers";

@ApiTags("Crypto / Tron")
@Controller("tron")
export class TronController {
  static supportedTRC20Tokens = [
    {
      name: "JUST Stablecoin",
      symbol: "USDJ",
      contract: "TLBaRhANQoJFTqre9Nf1mjuwNWjCJeYqUL",
      decimals: 18,
      network: "niles",
    },
    {
      name: "Wrapped TRX",
      symbol: "WTRX",
      contract: "TNUC9Qb1rRpS5CbWLmNMxXBjyFoydXjWFR",
      decimals: 18,
      network: "main",
    },
    {
      name: "Wrapped BTT",
      symbol: "WBTT",
      contract: "TKfjV9RNKJJCqPvBtK8L7Knykh7DNWvnYt",
      decimals: 18,
      network: "main",
    },
    {
      name: "Wrapped BTC",
      symbol: "WBTC",
      contract: "TXpw8XeWYeTUd4quDskoUqeQPowRh4jY65",
      decimals: 18,
      network: "main",
    },
    {
      name: "USD Coin",
      symbol: "USDC",
      contract: "TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8",
      decimals: 18,
      network: "main",
    },
    {
      name: "Tether",
      symbol: "USDT",
      contract: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
      decimals: 18,
      network: "main",
    },
    {
      name: "JUST Stablecoin",
      symbol: "USDJ",
      contract: "TMwFHYXLJaRUPeW6421aqXL4ZEzPRFGkGT",
      decimals: 18,
      network: "main",
    },
  ];

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

    console.log([
      {
        type: "address",
        value: to,
      },
      {
        type: "uint256",
        value: amount,
      },
    ]);

    return tx.transaction;
  }

  @Post(":network/send")
  //@Permissions('create:items')
  async sendToNetwork(
    @Param("network") network: string,
    @Body("hex") tx: string
  ): Promise<unknown> {
    const tronWeb = this.getTron(network);
    return tronWeb.trx.sendRawTransaction(tx);
  }

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
      const allTransactions = await tronWeb.fullNode.request(
        `/v1/accounts/${address}/transactions`
      );

      const response = {
        balance: account.balance,
        txrefs: allTransactions,
        whoami: account.address,
        tokens: [],
      };

      for (let i = TronController.supportedTRC20Tokens.length; i--; ) {
        const trc20 = TronController.supportedTRC20Tokens[i];
        if (trc20.network == network) {
          response.tokens.push({
            name: trc20.name,
            symbol: trc20.symbol,
            balance: await this.get20TokenBalance(
              trc20.contract,
              address,
              trc20.decimals,
              tronWeb
            ),
            decimals: trc20.decimals,
            address: trc20.contract,
            type: "trc20",
          });
        } else {
          response.tokens.push({
            name: trc20.name,
            symbol: trc20.symbol,
            balance: 0,
            decimals: trc20.decimals,
            address: trc20.contract,
            type: "trc20",
          });
        }
      }

      return response;
    } else {
      const tokens = [];
      for (let i = TronController.supportedTRC20Tokens.length; i--; ) {
        const trc20 = TronController.supportedTRC20Tokens[i];

        console.log(trc20);
        tokens.push({
          name: trc20.name,
          symbol: trc20.symbol,
          balance: 0,
          decimals: trc20.decimals,
          address: trc20.contract,
          type: "trc20",
        });
      }
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
  tokens: any[]
}

interface TronAddressTxRef {}
