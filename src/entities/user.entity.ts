import { Entity, ObjectID, ObjectIdColumn, Column, Index } from 'typeorm';

@Entity()
export class User {
  @ObjectIdColumn()
  id: ObjectID;

  @Index()
  @Column()
  nId: string;

  @Index()
  @Column()
  uuid: string;

  @Index()
  @Column()
  pnt: string;

  @Index()
  @Column()
  email: string;

  @Column()
  telephone: string;

  @Column()
  otpk: string[];

  @Column()
  lastOtpk: string;

  @Column()
  created: Date;

  @Column()
  updated: Date;
}
