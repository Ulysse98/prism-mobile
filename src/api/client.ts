import type {
  PrismDashboard,
  PrismFaucetClaim,
  PrismHumanityEntry,
  PrismParticipant,
  PrismReserved,
  PrismStatus,
  PrismValidator,
  PrismWalletSnapshot,
  PrismWorkEntry,
} from "./types";

const LOCAL_API = "http://127.0.0.1:8080/api/v1";

const ENV_API =
  process.env.EXPO_PUBLIC_PRISM_API_URL?.replace(/\/$/, "");

export const PRISM_API =
  ENV_API ?? (__DEV__ ? LOCAL_API : "");

type ValidatorResponse = {
  validators?: PrismValidator[];
  entries?: PrismValidator[];
};

type ParticipationResponse = {
  participants?: PrismParticipant[];
};

type WorkResponse = {
  entries?: PrismWorkEntry[];
};

type HumanityResponse = {
  identities?: PrismHumanityEntry[];
};

export async function getJson<T>(path: string): Promise<T> {
  if (!PRISM_API) {
    throw new Error("Prism API is not configured for this build.");
  }

  const response = await fetch(`${PRISM_API}${path}`);

  if (!response.ok) {
    throw new Error(`${path}: HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function loadDashboard(): Promise<PrismDashboard> {
  const [
    status,
    validatorData,
    participationData,
    workData,
    humanityData,
    reserved,
  ] = await Promise.all([
    getJson<PrismStatus>("/status"),
    getJson<ValidatorResponse>("/validators"),
    getJson<ParticipationResponse>("/participation"),
    getJson<WorkResponse>("/work"),
    getJson<HumanityResponse>("/humanity"),
    getJson<PrismReserved>("/reserved"),
  ]);

  return {
    status,
    validators: validatorData.validators ?? validatorData.entries ?? [],
    participants: participationData.participants ?? [],
    work: workData.entries ?? [],
    humanity: humanityData.identities ?? [],
    reserved,
  };
}

export async function loadWallet(
  address: string,
): Promise<PrismWalletSnapshot> {
  const normalized = address.trim();

  if (!normalized) {
    throw new Error(
      "Prism wallet address is required.",
    );
  }

  return getJson<PrismWalletSnapshot>(
    `/wallets/${encodeURIComponent(normalized)}`,
  );
}

export async function claimFaucet(
  address: string,
): Promise<PrismFaucetClaim> {
  if (!PRISM_API) {
    throw new Error(
      "Prism API is not configured for this build.",
    );
  }

  const normalized = address.trim();

  if (!normalized) {
    throw new Error(
      "Prism wallet address is required.",
    );
  }

  const response = await fetch(
    `${PRISM_API}/faucet`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        address: normalized,
      }),
    },
  );

  let body: unknown = null;

  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    const apiError =
      body &&
      typeof body === "object" &&
      "error" in body &&
      typeof body.error === "string"
        ? body.error
        : null;

    throw new Error(
      apiError ??
        `/faucet: HTTP ${response.status}`,
    );
  }

  return body as PrismFaucetClaim;
}
