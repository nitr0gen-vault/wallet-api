import { ActiveRequest } from "@activeledger/activeutilities";
import { Injectable } from "@nestjs/common";

@Injectable()
export class Nitr0genService {
  constructor() {}

  private async send(url: string, payload: object): Promise<object> {
    try {
      const response = await ActiveRequest.send(
        `${process.env.NOTA_URL}/${url}`,
        "POST",
        [
          `X-API-KEY:${process.env.NOTA_CLIENTID}.${process.env.NOTA_CLIENTSECRET}`,
        ],
        payload
      );

      if (response.data) {
        return response.data as object;
      } else {
        if (response.raw) {
          try {
            return JSON.parse(response.raw);
          } catch (e) {
            throw new Error("Failed to Parse");
          }
        }
      }
    } catch (e) {
      if (e.body) {
        try {
          const msg = JSON.parse(e.body);
          throw {
            name: e.name,
            message: msg,
          };
        } catch (parseError) {
          throw parseError;
        }
      } else {
        throw e;
      }
    }
  }

  public async passthrough(
    url: string,
    ntx: object
  ): Promise<any> { //{ id: string; nId: string; address: string }
    const safentx = Buffer.from(JSON.stringify(ntx)).toString("base64");
    const payload = {
      ntx: safentx,
    };

    try {
      const response = (await this.send(url, payload)) as any;
      return response;
    } catch (e) {
      throw e;
    }
  }



  public async getIdentity(
  ): Promise<{ id: string; notaId: string }> {
    const payload = {
    };

    try {
      const response = (await this.send("user/identity", payload)) as {
        id: string;
        notaId: string;
      };

      return response;
    } catch (e) {
      throw e;
    }
  }

  public async keyCreate(
    symbol: string,
    nId: string,
    ntx: object
  ): Promise<{
    id: string;
    nId: string;
    address: string;
    hashes: string[];
  }> {
    const safentx = Buffer.from(JSON.stringify(ntx)).toString("base64");
    const payload = {
      symbol,
      nId,
      ntx: safentx,
    };

    try {
      const response = (await this.send("keys", payload)) as {
        id: string;
        nId: string;
        address: string;
        hashes: string[];
      };

      return response;
    } catch (e) {
      throw e;
    }
  }
}
