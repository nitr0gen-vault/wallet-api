import { Entity, ObjectID, ObjectIdColumn, Column, Index } from 'typeorm';

@Entity()
export class Key {
  @ObjectIdColumn()
  id: ObjectID;

  @ObjectIdColumn()
  userId: ObjectID;

  @Index()
  @Column()
  nId: string;
  
  @Column()
  symbol: string;

  @Column()
  address: string;

  @Column()
  created: Date;

  @Column()
  updated: Date;
}
