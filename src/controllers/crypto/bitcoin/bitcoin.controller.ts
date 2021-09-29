import { Body, Controller, Post, UseGuards, Get, Param } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ApiTags } from '@nestjs/swagger';
//import { Permissions } from '../../../decorators/permissions.decorator';
import { lastValueFrom } from 'rxjs/internal/lastValueFrom';
import { AuthGuard } from '../../../guards/auth.guard';

@ApiTags('Crypto / Bitcoin')
@Controller('bitcoin')
export class BitcoinController {
  constructor(private httpService: HttpService) {}

  private getProvider(network: string): string {
    switch (network) {
      default:
      case 'main':
        return 'https://api.blockcypher.com/v1/btc/main';
      case 'test':
        return 'https://api.blockcypher.com/v1/btc/test3';
    }
  }

  @UseGuards(AuthGuard)
  @Post(':network/create')
  async fee(
    @Param('network') network: string,
    @Body('inputs') inputs: string[],
    @Body('outputs') outputs: string[],
  ): Promise<BitcoinCreateResponse> {
    const url = this.getProvider(network);
    const response: BitcoinCreateResponse = {
      inputs: [],
      outputs: [],
      fees: 0,
      amount: 0,
      to: '',
    };

    const results = (
      await lastValueFrom(
        this.httpService.post<{
          tx: {
            fees: number;
            inputs: [
              {
                addresses: string[];
                prev_hash: string;
                output_index: number;
                output_value: number;
              },
            ];
            outputs: [
              {
                addresses: string[];
                value: number;
              },
            ];
          };
        }>(`${url}/txs/new?includeToSignTx=true`, {
          inputs,
          outputs,
        }),
      )
    ).data;

    // Update Helpers
    response.amount = results.tx.outputs[0].value / 100000000;
    response.to = results.tx.outputs[0].addresses[0];
    response.fees = results.tx.fees

    // Extract UTXO and Outbound
    results.tx.inputs.forEach((input) => {
      response.inputs.push({
        address: input.addresses[0],
        txid: input.prev_hash,
        outputIndex: input.output_index,
        satoshis: input.output_value,
        script: null,
        scriptPubKey: null,
      });
    });

    results.tx.outputs.forEach((output) => {
      response.outputs.push({
        address: output.addresses[0],
        satoshis: output.value,
      });
    });

    //const results = response.data.tx.outputs[0];

    return response;
  }

  @UseGuards(AuthGuard)
  @Post(':network/send')
  //@Permissions('create:items')
  async sendToNetwork(
    @Param('network') network: string,
    @Body('hex') tx: string,
  ): Promise<unknown> {
    const url = this.getProvider(network);

    const response = await lastValueFrom(
      this.httpService.post<any>(`${url}/txs/push`, { tx }),
    );
    return response.data;
  }

  @UseGuards(AuthGuard)
  @Get(':network/:address')
  async wallet(
    @Param('network') network: string,
    @Param('address') address: string,
  ): Promise<BitcoinAddress> {
    const url = this.getProvider(network);

    const response = await lastValueFrom(
      this.httpService.get<BitcoinAddress>(`${url}/addrs/${address}`),
    );
    return response.data;
  }
}

interface BitcoinAddress {
  address: string;
  total_received: number;
  total_sent: number;
  balance: number;
  unconfirmed_balance: number;
  final_balance: number;
  n_tx: number;
  unconfirmed_n_tx: number;
  final_n_tx: number;
  txrefs: BitcoinAddressTxRef[];
}

interface BitcoinAddressTxRef {
  tx_hash: string;
  block_height: number;
  tx_input_n: number;
  tx_output_n: number;
  value: number;
  ref_balance: number;
  confirmations: number;
  confirmed: Date;
  double_spend: boolean;
}

interface BitcoinCreateResponse {
  inputs: {
    address: string;
    txid: string;
    outputIndex: number;
    satoshis: number;
    script: null;
    scriptPubKey: null;
  }[];
  outputs: {
    address: string;
    satoshis: number;
  }[];
  fees: number;
  to: string;
  amount: number;
}
