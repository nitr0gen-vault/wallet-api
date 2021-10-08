import {
  Entity,
  ObjectID,
  ObjectIdColumn,
  Column,
  Index,
  Unique,
} from "typeorm";

@Entity()
export class User {
  @ObjectIdColumn()
  id: ObjectID;

  @Index()
  @Column()
  nId: string;

  @Index({ unique: true })
  @Column()
  uuid: string;

  @Index()
  @Column()
  pnt: string;

  @Index()
  @Column()
  email: string;

  @Column()
  recovery: string;

  @Column()
  security: any;

  @Column()
  telephone: string;

  @Column()
  pairing: any;

  @Column()
  otpk: string[];

  @Column()
  lastOtpk: string;

  @Column()
  created: Date;

  @Column()
  updated: Date;
}
