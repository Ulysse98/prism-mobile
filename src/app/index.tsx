import { useCallback, useEffect, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import PrismProButton from "@/components/prism-pro-button";

import { loadDashboard, PRISM_API } from "../api/client";
import type {
  PrismHumanityEntry,
  PrismParticipant,
  PrismReserved,
  PrismStatus,
  PrismValidator,
  PrismWorkEntry,
} from "../api/types";

function short(value?: string) {
  if (!value) return "—";
  if (value.length <= 24) return value;
  return `${value.slice(0, 12)}…${value.slice(-8)}`;
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const [status, setStatus] = useState<PrismStatus | null>(null);
  const [validators, setValidators] = useState<PrismValidator[]>([]);
  const [participants, setParticipants] = useState<PrismParticipant[]>([]);
  const [work, setWork] = useState<PrismWorkEntry[]>([]);
  const [humanity, setHumanity] = useState<PrismHumanityEntry[]>([]);
  const [reserved, setReserved] = useState<PrismReserved | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);

    try {
      const dashboard = await loadDashboard();

      setStatus(dashboard.status);
      setValidators(dashboard.validators);
      setParticipants(dashboard.participants);
      setWork(dashboard.work);
      setHumanity(dashboard.humanity);
      setReserved(dashboard.reserved);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to reach Prism API",
      );
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load()}
          />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>PRISM</Text>
            <Text style={styles.subtitle}>
              {status
                ? `${status.network} | P2P ${status.protocol}`
                : "CONNECTING..."}
            </Text>
          </View>

          <View style={styles.online}>
            <View style={styles.dot} />
            <Text style={styles.onlineText}>
              {error ? "OFFLINE" : "SYSTEM ONLINE"}
            </Text>
          </View>
        </View>

        <PrismProButton />

        {error && (
          <Card title="Connection error">
            <Text style={styles.error}>{error}</Text>
            <Text style={styles.mono}>{PRISM_API}</Text>
          </Card>
        )}

        {status && (
          <>
            <Card title="Network">
              <Text style={styles.network}>{status.network}</Text>

              <View style={styles.metrics}>
                <View style={styles.metric}>
                  <Text style={styles.metricValue}>{status.height}</Text>
                  <Text style={styles.metricLabel}>HEIGHT</Text>
                </View>

                <View style={styles.metric}>
                  <Text style={styles.metricValue}>{status.blocks}</Text>
                  <Text style={styles.metricLabel}>BLOCKS</Text>
                </View>

                <View style={styles.metric}>
                  <Text style={styles.metricValue}>{status.validators}</Text>
                  <Text style={styles.metricLabel}>VALIDATORS</Text>
                </View>
              </View>

              <Row
                label="Chain valid"
                value={status.chainValid ? "TRUE" : "FALSE"}
              />
              <Row label="Total stake" value={`${status.totalStake} PRISM`} />
              <Row label="Total supply" value={`${status.totalSupply} PRISM`} />
              <Row label="Node" value={`v${status.version}`} />
              <Row label="P2P" value={status.protocol} />

              <Text style={styles.hashLabel}>LAST HASH</Text>
              <Text style={styles.mono}>{short(status.lastHash)}</Text>
            </Card>

            {reserved && (
              <Card title="Reserved">
                <View style={styles.metrics}>
                  <View style={styles.metric}>
                    <Text style={styles.metricValue}>
                      {reserved.explicitUsed}
                    </Text>
                    <Text style={styles.metricLabel}>USED</Text>
                  </View>

                  <View style={styles.metric}>
                    <Text style={styles.metricValue}>
                      {reserved.grants.length}
                    </Text>
                    <Text style={styles.metricLabel}>GRANTS</Text>
                  </View>

                  <View style={styles.metric}>
                    <Text style={styles.metricValue}>
                      {reserved.revocations.length}
                    </Text>
                    <Text style={styles.metricLabel}>REVOKED</Text>
                  </View>
                </View>

                <Row
                  label="Legacy genesis"
                  value={`${reserved.legacyGenesis.toLocaleString()} PRISM`}
                />

                <Row
                  label="Remaining"
                  value={`${reserved.remaining.totalRemaining.toLocaleString()} PRISM`}
                />

                <Row
                  label="Ecosystem"
                  value={`${reserved.usage.ecosystem.toLocaleString()} / ${reserved.remaining.ecosystemRemaining.toLocaleString()}`}
                />

                <Row
                  label="Treasury"
                  value={`${reserved.usage.treasury.toLocaleString()} / ${reserved.remaining.treasuryRemaining.toLocaleString()}`}
                />

                <Row
                  label="Team"
                  value={`${reserved.usage.team.toLocaleString()} / ${reserved.remaining.teamRemaining.toLocaleString()}`}
                />

                <Row
                  label="Liquidity"
                  value={`${reserved.usage.liquidity.toLocaleString()} / ${reserved.remaining.liquidityRemaining.toLocaleString()}`}
                />

                {reserved.grants.map((grant) => (
                  <View key={grant.id} style={styles.entry}>
                    <View style={styles.entryHeader}>
                      <Text style={styles.name}>{grant.pool}</Text>
                      <Text style={styles.good}>{grant.status}</Text>
                    </View>

                    <Text style={styles.secondary}>
                      {grant.amount.toLocaleString()} PRISM
                    </Text>

                    <Text style={styles.secondary}>
                      Approvals: {grant.approvals}
                    </Text>

                    <Text style={styles.mono}>{short(grant.id)}</Text>
                  </View>
                ))}

                {reserved.revocations.map((revocation) => (
                  <View key={revocation.id} style={styles.entry}>
                    <View style={styles.entryHeader}>
                      <Text style={styles.name}>{revocation.pool}</Text>

                      <Text style={styles.revoked}>{revocation.status}</Text>
                    </View>

                    <Text style={styles.secondary}>
                      Approvals: {revocation.approvals}
                    </Text>

                    <Text style={styles.secondary}>
                      Grant {short(revocation.grantId)}
                    </Text>

                    <Text style={styles.mono}>block {revocation.block}</Text>
                  </View>
                ))}
              </Card>
            )}

            <Card title={`Humanity (${humanity.length})`}>
              {humanity.map((item, index) => (
                <View key={`${item.address}-${index}`} style={styles.entry}>
                  <Text style={styles.name}>{item.name} ✓</Text>
                  <Text style={styles.secondary}>
                    {item.provider} · {item.action}
                  </Text>
                  <Text style={styles.mono}>block {item.block}</Text>
                  <Text style={styles.mono}>{short(item.address)}</Text>
                </View>
              ))}
            </Card>

            <Card
              title={`Proof of Useful Participation (${participants.length})`}
            >
              {participants.map((item, index) => (
                <View key={`${item.address}-${index}`} style={styles.entry}>
                  <View style={styles.entryHeader}>
                    <Text style={styles.name}>{item.name}</Text>
                    <Text style={styles.score}>
                      {item.participationScore} pts
                    </Text>
                  </View>

                  <Text style={styles.secondary}>
                    Blocks proposed: {item.blocksProposed}
                  </Text>
                  <Text style={styles.secondary}>
                    Useful work units: {item.usefulWorkUnits}
                  </Text>
                  <Text style={styles.secondary}>
                    Humanity verified: {item.humanityVerified ? "YES" : "NO"}
                  </Text>
                </View>
              ))}
            </Card>

            <Card title={`Useful Work (${work.length})`}>
              {work.slice(0, 6).map((item, index) => (
                <View key={`${item.proofId}-${index}`} style={styles.entry}>
                  <View style={styles.entryHeader}>
                    <Text style={styles.name}>{item.worker}</Text>
                    <Text style={styles.good}>
                      {item.verified ? "VERIFIED" : "INVALID"}
                    </Text>
                  </View>

                  <Text style={styles.secondary}>
                    {item.task} → {item.result}
                  </Text>
                  <Text style={styles.secondary}>
                    Block {item.block} · score {item.score} · reward{" "}
                    {item.reward} PRISM
                  </Text>
                </View>
              ))}
            </Card>

            <Card title={`Validators (${validators.length})`}>
              {validators.map((item, index) => (
                <View key={`${item.address}-${index}`} style={styles.entry}>
                  <View style={styles.entryHeader}>
                    <Text style={styles.name}>{item.name}</Text>
                    <Text style={styles.stake}>{item.stake} PRISM</Text>
                  </View>

                  <Text style={styles.mono}>{short(item.address)}</Text>
                </View>
              ))}
            </Card>
          </>
        )}

        <Text style={styles.footer}>
          Prism · PoS + PoUW + Humanity-gated PoUP
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#05070c",
  },
  content: {
    padding: 18,
    gap: 14,
    paddingBottom: 50,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logo: {
    color: "#ffffff",
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: 5,
  },
  subtitle: {
    color: "#6f7d93",
    fontSize: 11,
    letterSpacing: 2,
  },
  online: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0b281b",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#45e391",
  },
  onlineText: {
    color: "#8bf0b7",
    fontSize: 9,
    fontWeight: "900",
  },
  card: {
    backgroundColor: "#0c111b",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#192337",
    padding: 17,
  },
  cardTitle: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 12,
  },
  network: {
    color: "#67a7ff",
    fontSize: 24,
    fontWeight: "900",
  },
  metrics: {
    flexDirection: "row",
    gap: 8,
    marginVertical: 16,
  },
  metric: {
    flex: 1,
    backgroundColor: "#111a2a",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  metricValue: {
    color: "#ffffff",
    fontSize: 19,
    fontWeight: "900",
  },
  metricLabel: {
    color: "#66758e",
    fontSize: 8,
    marginTop: 4,
    fontWeight: "800",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#222c3c",
    paddingVertical: 9,
  },
  label: {
    color: "#77869c",
  },
  value: {
    color: "#ffffff",
    fontWeight: "700",
  },
  entry: {
    paddingVertical: 11,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#222c3c",
  },
  entryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  name: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 15,
  },
  secondary: {
    color: "#8190a6",
    marginTop: 4,
    fontSize: 12,
  },
  mono: {
    color: "#687790",
    fontFamily: "monospace",
    fontSize: 10,
    marginTop: 4,
  },
  hashLabel: {
    color: "#58677e",
    fontSize: 9,
    marginTop: 12,
    fontWeight: "900",
    letterSpacing: 1,
  },
  score: {
    color: "#67a7ff",
    fontWeight: "900",
  },
  good: {
    color: "#45e391",
    fontWeight: "900",
    fontSize: 11,
  },
  revoked: {
    color: "#ff737e",
    fontWeight: "900",
    fontSize: 11,
  },
  stake: {
    color: "#e1bc68",
    fontWeight: "900",
  },
  error: {
    color: "#ff737e",
  },
  footer: {
    color: "#46546b",
    textAlign: "center",
    fontSize: 10,
    marginTop: 8,
  },
});
