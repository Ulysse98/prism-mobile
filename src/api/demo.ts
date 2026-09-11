import type { PrismDashboard } from "./types";

export const DEMO_DASHBOARD = {
  status: {
    network: "Prism DemoNet",
    protocol: "0.29",
    height: 128,
    blocks: 129,
    validators: 3,
    chainValid: true,
    totalStake: 1000,
    totalSupply: 2610,
    version: "0.29-demo",
    lastHash:
      "75a54c49b361f21cf74ac68a2e4895a8c77696ee9a449b93d92568f32a4c4871",
  },

  validators: [
    {
      name: "Alice",
      address: "prism1alice000000000000000000000001",
      stake: 500,
    },
    {
      name: "Bob",
      address: "prism1bob0000000000000000000000002",
      stake: 300,
    },
    {
      name: "Charlie",
      address: "prism1charlie00000000000000000003",
      stake: 200,
    },
  ],

  participants: [
    {
      name: "Alice",
      address: "prism1alice000000000000000000000001",
      participationScore: 96,
      blocksProposed: 9,
      usefulWorkUnits: 3,
      humanityVerified: true,
    },
    {
      name: "Charlie",
      address: "prism1charlie00000000000000000003",
      participationScore: 62,
      blocksProposed: 2,
      usefulWorkUnits: 21,
      humanityVerified: true,
    },
  ],

  work: [
    {
      proofId: "demo-work-001",
      worker: "Charlie",
      verified: true,
      task: "sum_squares",
      result: "194",
      block: 127,
      score: 21,
      reward: 2,
    },
  ],

  humanity: [
    {
      name: "Alice",
      address: "prism1alice000000000000000000000001",
      provider: "World ID",
      action: "humanity",
      block: 120,
    },
    {
      name: "Charlie",
      address: "prism1charlie00000000000000000003",
      provider: "World ID",
      action: "humanity",
      block: 124,
    },
  ],

  reserved: {
    explicitUsed: 0,
    legacyGenesis: 2500,

    usage: {
      ecosystem: 0,
      treasury: 0,
      team: 0,
      liquidity: 0,
    },

    remaining: {
      totalRemaining: 40000000,
      ecosystemRemaining: 15000000,
      treasuryRemaining: 10000000,
      teamRemaining: 10000000,
      liquidityRemaining: 5000000,
    },

    grants: [],
    revocations: [],
  },
} as unknown as PrismDashboard;
