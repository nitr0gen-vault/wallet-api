import {
  Body,
  Controller,
  Post,
  Put,
  Request,
  Get,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Nitr0genService } from "../../../services/notabox/nitr0gen.service";

@ApiTags("One Time Key")
@Controller("otk")
export class OtkController {
  constructor(private nota: Nitr0genService) {}

  @Post()
  //@Permissions('appy:create:users')
  async onboard(@Body("ntx") ntx: object): Promise<any> {
    const nota = await this.nota.passthrough("user/onboard", ntx);
    return nota;
  }

  @Post("recovery")
  async recovery(
    @Body("ntx") ntx: any,
    @Request() req: any
  ): Promise<any> {
    const nota = await this.nota.passthrough("user/recovery", ntx);
    return nota;
  }

  @Post("security")
  async security(
    @Body("ntx") ntx: any,
    @Request() req: any
  ): Promise<any> {
    const nota = await this.nota.passthrough("user/recovery", ntx);
    return nota;
  }
}
