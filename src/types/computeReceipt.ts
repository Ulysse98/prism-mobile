export type ComputeReceiptChain =
  | "prism"
  | "arbitrum"
  | "solana";

export type ComputeReceiptSettlementStatus =
  | "pending"
  | "confirmed"
  | "failed";

export type ComputeReceiptResult =
  | number
  | string
  | number[];

export type PrismCrossChainReceipt = {
  version: 1;

  jobId: string;
  proofId: string;

  workerIdHash: string;
  prismChainIdHash: string;
  registryId: string;
};

export type ComputeReceiptSettlement = {
  chain: Exclude<
    ComputeReceiptChain,
    "prism"
  >;

  status:
    ComputeReceiptSettlementStatus;

  txHash?: string;
  registryAddress?: string;
  blockNumber?: number;
  explorerUrl?: string;
};

export type ComputeReceipt = {
  version: 1;

  jobId: string;
  proofId: string;

  taskType: string;

  requester?: string;
  worker: string;

  prismChainId: string;

  result: ComputeReceiptResult;
  outputHash: string;

  score?: number;
  reward?: number;

  verified: boolean;

  createdAt: string;

  crossChainReceipt?: PrismCrossChainReceipt;

  settlements:
    ComputeReceiptSettlement[];
};

export function createComputeReceipt(
  input: Omit<
    ComputeReceipt,
    "version" | "settlements"
  > & {
    settlements?:
      ComputeReceiptSettlement[];
  },
): ComputeReceipt {
  return {
    version: 1,
    ...input,
    settlements:
      input.settlements ?? [],
  };
}

export function hasConfirmedSettlement(
  receipt: ComputeReceipt,
  chain: Exclude<
    ComputeReceiptChain,
    "prism"
  >,
): boolean {
  return receipt.settlements.some(
    (settlement) =>
      settlement.chain === chain &&
      settlement.status ===
        "confirmed",
  );
}
