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

@ApiTags("One Time Key")
@Controller("otk")
export class OtkController {
  constructor(
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
    return nota;
  }
}
