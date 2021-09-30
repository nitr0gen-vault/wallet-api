import {
  Body,
  Controller,
  Post,
  Put,
  Request,
  Get,
  UseGuards,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { InjectRepository } from "@nestjs/typeorm";
import { User } from "../../../entities/user.entity";
import { Repository } from "typeorm";
import { AuthGuard } from "../../../guards/auth.guard";
import { Nitr0genService } from "../../../services/notabox/nitr0gen.service";
import { Key } from "../../../entities/key.entity";

@ApiTags("One Time Key")
@Controller("otk")
export class OtkController {
  constructor(
    @InjectRepository(Key)
    private KeyRepository: Repository<Key>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private nota: Nitr0genService
  ) {}

  @Post()
  async onboard(@Body("ntx") ntx: any, @Body("pnt") pnt = ""): Promise<any> {
    const nota = await this.nota.passthrough("user/onboard", ntx);
    const now = new Date();

    await this.usersRepository.save(
      this.usersRepository.create({
        nId: nota.nId,
        uuid: ntx.$tx.$i.otk.uuid,
        pnt,
        email: "",
        telephone: "",
        otpk: [ntx.$tx.$i.otk.publicKey],
        lastOtpk: ntx.$tx.$i.otk.publicKey,
        created: now,
        updated: now,
      })
    );

    return nota;
  }

  @Post("uuid")
  @UseGuards(AuthGuard)
  async uuid(@Body("uuid") uuid: any): Promise<{ nId: string }> {
    const users = await this.usersRepository.find({ where: { uuid } });
    if (users.length) {
      return {
        nId: users[0].nId,
      };
    }
    return {
      nId: null,
    };
  }

  @Post("public")
  @UseGuards(AuthGuard)
  async otpk(@Body("uuid") uuid: any): Promise<{ otpk: string }> {
    const users = await this.usersRepository.find({ where: { uuid } });
    if (users.length) {
      return {
        otpk: users[0].lastOtpk,
      };
    }
    return {
      otpk: null,
    };
  }

  @Get("public/pending")
  @UseGuards(AuthGuard)
  async otpkCheck(@Request() req: any): Promise<any> {
    return req.user.pairing;
  }

  @Post("public/pending")
  @UseGuards(AuthGuard)
  async pairConfirm(
    @Body("accepted") approve: boolean,
    @Request() req: any
  ): Promise<any> {
    console.log(`Aprroving? ${approve}`);
    console.log(req.user.pairing);
    if (req.user.pairing) {
      // Unlike social recovery (wallet cache) this is direct otk so lets actually assign the wallets
      let keys;
      if (approve) {
        // Get User then get user keys
        const users = await this.usersRepository.find({
          where: { uuid: req.user.pairing.uuid },
        });
        if (users.length) {
          keys = await this.KeyRepository.find({
            where: { userId: users[0].id },
          });

          if (keys) {
            for (let i = 0; i < keys.length; i++) {
              const key = keys[i];

              key.id = null;
              key.userId = req.user.id;
              await this.KeyRepository.save(key);
            }
          }
        }
      }
      // clear
      req.user.pairing = null;
      await this.usersRepository.save(req.user);

      return {
        keys: keys ? keys.length : 0,
      };
    } else {
      return {
        keys: 0,
      };
    }
  }

  @Post("public/approve")
  @UseGuards(AuthGuard)
  async otpkPending(
    @Body("ntx") ntx: any,
    @Body("uuid") uuid: any,
    @Request() req: any
  ): Promise<any> {
    const nota = await this.nota.passthrough("user/recovery", ntx);

    // Validate it is true not an issue if false
    const users = await this.usersRepository.find({ where: { uuid } });

    if (users.length) {
      const user = users[0];

      // Update nId
      user.pairing = {
        nId: ntx.$tx.$i.otk.$stream,
        uuid: req.user.uuid,
      };

      await this.usersRepository.save(user);
    }

    return nota;
  }

  @Post("recovery")
  @UseGuards(AuthGuard)
  async recovery(@Body("ntx") ntx: any, @Request() req: any): Promise<any> {
    const nota = await this.nota.passthrough("user/recovery", ntx);
    return nota;
  }

  @Post("security")
  @UseGuards(AuthGuard)
  async security(@Body("ntx") ntx: any, @Request() req: any): Promise<any> {
    const nota = await this.nota.passthrough("user/recovery", ntx);

    let updated = false;
    switch (ntx.$tx.$entry) {
      case "update.security":
        req.user.security = ntx.$tx.$i.otk.security;
        updated = true;
        break;
      case "update.email":
        req.user.email = ntx.$tx.$i.otk.email;
        updated = true;
        break;
      case "update.recovery":
        req.user.recovery = ntx.$tx.$i.otk.recovery;
        updated = true;
        break;
      case "update.telephone":
        req.user.telephone = ntx.$tx.$i.otk.telephone;
        updated = true;
        break;
    }

    if (updated) {
      console.log("updating user");
      console.log(req.user);
      await this.usersRepository.save(req.user);
    }

    return nota;
  }
}
