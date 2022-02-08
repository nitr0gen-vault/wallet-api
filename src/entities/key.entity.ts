import { BigNumber } from "ethers";
import { ObjectID } from "mongodb";
import { Entity, ObjectIdColumn, Column, Index } from "typeorm";

@Entity()
export class Key {
  @ObjectIdColumn()
  _id: ObjectID;

  @ObjectIdColumn()
  userId: ObjectID;

  @Index()
  @Column()
  nId: string;

  @Column()
  symbol: string;

  @Index()
  @Column()
  address: string;

  @Column()
  chainId: number;

  @Column()
  hashes: string[];

  @Column()
  balance?: BigNumber;

  @Column()
  balanceUpdated?: Date;

  @Column()
  fragmentManager?: Fragmentation;

  @Column({
    default: false,
  })
  partitioned: boolean = false;

  @Column()
  partitions?: Partitions;

  @Column()
  tokens: Token[];

  @Column()
  created: Date;

  @Column()
  updated: Date;
}

interface Partitions {
  [index: string]: Partition;
}

interface Partition extends SubPartition {
  subparts: SubPartition[];
}

interface SubPartition {
  id?: string; //should be nid
  hex: string;
  value: string;
}

export interface Token {
  decimal?: number;
  balance?: number;
  name: string;
  contract: string;
  symbol: string;
  network: string;
}

interface Fragmentation {
  fragments: Fragment[];
}

interface Fragment {
  nId: string;
  balance: BigNumber;
  tx: string;
  reason?: string;
  permissions?: unknown;
  owner?: String;
}
