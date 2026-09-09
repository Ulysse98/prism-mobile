import type {
  PrismDashboard,
  PrismHumanityEntry,
  PrismParticipant,
  PrismReserved,
  PrismStatus,
  PrismValidator,
  PrismWorkEntry,
} from "./types";

const DEFAULT_API = "http://127.0.0.1:8080/api/v1";

export const PRISM_API =
  process.env.EXPO_PUBLIC_PRISM_API_URL?.replace(/\/$/, "") ?? DEFAULT_API;

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
