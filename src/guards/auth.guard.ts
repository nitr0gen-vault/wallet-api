import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { User } from "../entities/user.entity";
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ctx = context.getArgByIndex(0);
    const uuid = ctx.headers["x-api-uuid"] as string;

    if (uuid) {
      const user = await this.usersRepository.find({ uuid });
      if (user.length) {
        ctx.user = user[0];
        return true;
      } else {
        // Onboarding is allowed
        return ctx.url === "/otk";
      }
    }
    return false;
  }
}
