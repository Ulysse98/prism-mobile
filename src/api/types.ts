export type PrismStatus = {
  network: string;
  height: number;
  blocks: number;
  validators: number;
  chainValid: boolean;
  totalStake: number;
  totalSupply: number;
  version: string;
  protocol: string;
  lastHash?: string;
};

export type PrismValidator = {
  name: string;
  address: string;
  stake: number;
};

export type PrismParticipant = {
  name: string;
  address: string;
  participationScore: number;
  blocksProposed: number;
  usefulWorkUnits: number;
  humanityVerified: boolean;
};

export type PrismWorkEntry = {
  proofId: string;
  worker: string;
  verified: boolean;
  task: string;
  result: string | number;
  block: number;
  score: number;
  reward: number;
};

export type PrismHumanityEntry = {
  address: string;
  name: string;
  provider: string;
  action: string;
  block: number;
};

export type PrismDashboard = {
  status: PrismStatus;
  validators: PrismValidator[];
  participants: PrismParticipant[];
  work: PrismWorkEntry[];
  humanity: PrismHumanityEntry[];
  reserved: PrismReserved;
};

export type PrismReservedUsage = {
  ecosystem: number;
  treasury: number;
  team: number;
  liquidity: number;
};

export type PrismReservedRemaining = {
  ecosystemRemaining: number;
  treasuryRemaining: number;
  teamRemaining: number;
  liquidityRemaining: number;
  totalRemaining: number;
};

export type PrismReservedGrant = {
  block: number;
  id: string;
  pool: string;
  recipient: string;
  amount: number;
  nonce: number;
  notBeforeHeight: number;
  expiresAtHeight: number;
  approvals: number;
  status: string;
};

export type PrismReservedRevocation = {
  block: number;
  id: string;
  pool: string;
  grantId: string;
  approvals: number;
  status: string;
};

export type PrismReserved = {
  height: number;
  explicitUsed: number;
  legacyGenesis: number;
  usage: PrismReservedUsage;
  remaining: PrismReservedRemaining;
  grants: PrismReservedGrant[];
  revocations: PrismReservedRevocation[];
};
