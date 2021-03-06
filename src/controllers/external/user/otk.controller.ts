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
import { Nitr0genService } from "../../../services/nitr0gen/nitr0gen.service";
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
  @UseGuards(AuthGuard)
  async onboard(
    @Body("ntx") ntx: any,
    @Body("pnt") pnt = "",
    @Request() req: any
  ): Promise<any> {
    const nota = await this.nota.passthrough("user/onboard", ntx);
    const now = new Date();

    if (req.user) {
      req.user.nId = nota.nId;
      // uuid should be the same as the devices was known but lost its identity
      req.user.otpk.push(ntx.$tx.$i.otk.publicKey),
        (req.user.lastOtpk = ntx.$tx.$i.otk.publicKey),
        (req.user.updated = now);
      await this.usersRepository.save(req.user);
    } else {
      await this.usersRepository.save(
        this.usersRepository.create({
          nId: nota.nId,
          uuid: ntx.$tx.$i.otk.uuid,
          pnt,
          email: "",
          telephone: "",
          otpk: [ntx.$tx.$i.otk.publicKey],
          lastOtpk: ntx.$tx.$i.otk.publicKey,
          promotions: ["prelaunchDeposit"],
          promoTracking: {
            prelaunchDeposit: {
              history: [],
            },
          },
          created: now,
          updated: now,
        })
      );
    }
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
        // Need to change nId to the old one
        // OR before this ADD their nId to the owner array!
        // That maybe better with all the uuid changes
        // we do however force nId on social so lets do that here

        // Get User then get user keys
        const users = await this.usersRepository.find({
          where: { uuid: req.user.pairing.uuid },
        });
        if (users.length) {
          keys = await this.KeyRepository.find({
            where: { userId: users[0]._id },
          });

          if (keys) {
            for (let i = 0; i < keys.length; i++) {
              const key = keys[i];

              // TODO Check for duplicates (re double pairing scenario)

              key._id = null;
              key.userId = req.user._id;
              // console.log("Mergeing Key ======= " + key.address);
              // console.log(key);
              await this.KeyRepository.insert(key);
            }
          }
        }
        // For nId
        req.user.nId = req.user.pairing.nId;

        // Also settings
        req.user.email = users[0].email;
        req.user.telephone = users[0].telephone;
        req.user.security = users[0].security;
        req.user.recovery = users[0].recovery;
      }
      // clear
      req.user.pairing = null;
      await this.usersRepository.save(req.user);

      return {
        nId: req.user.nId,
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

    if (nota.$streams?.updated[0].id === ntx.$tx.$i.otk.$stream) {
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
    }

    return nota;
  }

  @Post("recovery")
  @UseGuards(AuthGuard)
  async recovery(@Body("ntx") ntx: any, @Request() req: any): Promise<any> {
    const nota = await this.nota.passthrough("user/recovery", ntx);

    // Detect recovery phase to merge settings
    if (
      ntx.$tx.$entry === "recovery.validate" &&
      nota.$streams?.updated[0].id === ntx.$tx.$o.recovery.$stream
    ) {
      const oldOTK = await this.usersRepository.find({
        where: { nId: ntx.$tx.$o.recovery.$stream },
      });
      if (oldOTK.length) {
        const oldUser = oldOTK[0] as User;
        // Merge
        req.user.security = oldUser.security;
        req.user.email = oldUser.email;
        req.user.recovery = oldUser.recovery;
        req.user.telephone = oldUser.telephone;
        console.log("updating user " + req.user._id);
        await this.usersRepository.save(req.user);

        // With a recovery we don't keep th keys so we just need to delete current and copy accross from old
        // TODO make this and public/pending code re-usable not like this at all!
        const newUnusedKeys = await this.KeyRepository.find({where: {userId: req.user._id}});
        for (let i = 0; i < newUnusedKeys.length; i++) {
          const key = newUnusedKeys[i];
          console.log(`deleting key ${key._id}`); // probably better to not delete but also not make it empty to avoid caching ledger has it
          await this.KeyRepository.delete(key._id);          
        }

        const keys = await this.KeyRepository.find({
          where: { userId: oldUser._id },
        });

        if (keys) {
          for (let i = 0; i < keys.length; i++) {
            const key = keys[i];

            // TODO Check for duplicates (re double pairing scenario)

            key._id = null;
            key.userId = req.user._id;    
            console.log(`inserting old key to new user : ${key.address}`);
            await this.KeyRepository.insert(key);
          }
        }


      }      
    }

    return nota;
  }

  @Post("security")
  @UseGuards(AuthGuard)
  async security(@Body("ntx") ntx: any, @Request() req: any): Promise<any> {
    const nota = (await this.nota.passthrough("user/recovery", ntx)) as any;

    let updated = false;

    if (nota.$streams?.updated[0].id === ntx.$tx.$i.otk.$stream) {
      switch (ntx.$tx.$entry) {
        case "update.security":
        case "update.security.save":
          req.user.security = ntx.$tx.$i.otk.security;
          updated = true;
          break;
        case "update.email":
        case "update.email.save":
          req.user.email = ntx.$tx.$i.otk.email;
          updated = true;
          break;
        case "update.recovery":
        case "update.recovery.save":
          req.user.recovery = ntx.$tx.$i.otk.recovery;
          updated = true;
          break;
        case "update.telephone":
        case "update.telephone.save":
          req.user.telephone = ntx.$tx.$i.otk.telephone;
          updated = true;
          break;
      }
    }

    if (updated) {
      console.log("updating user");
      console.log(req.user);
      await this.usersRepository.save(req.user);
    }

    return nota;
  }
}
