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
};
