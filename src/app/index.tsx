import {
  type ReactNode,
  useCallback,
  useState,
} from "react";
import { useFocusEffect } from "expo-router";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import PrismProButton from "@/components/prism-pro-button";

import { loadDashboard } from "../api/client";
import { DEMO_DASHBOARD } from "../api/demo";

import type {
  PrismHumanityEntry,
  PrismParticipant,
  PrismReserved,
  PrismStatus,
  PrismValidator,
  PrismWorkEntry,
} from "../api/types";

type ConnectionMode = "connecting" | "live" | "demo";

function short(value?: string) {
  if (!value) return "—";
  if (value.length <= 24) return value;

  return `${value.slice(0, 12)}…${value.slice(-8)}`;
}

function formatNumber(value: number) {
  return value.toLocaleString();
}

function Card({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

function Metric({
  value,
  label,
}: {
  value: string | number;
  label: string;
}) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function AllocationBar({
  label,
  used,
  remaining,
  reserveTotal,
}: {
  label: string;
  used: number;
  remaining: number;
  reserveTotal: number;
}) {
  const allocationTotal = used + remaining;
  const allocationShare =
    reserveTotal > 0
      ? Math.min(
          100,
          Math.max(0, (allocationTotal / reserveTotal) * 100),
        )
      : 0;

  const usagePercentage =
    allocationTotal > 0
      ? Math.min(
          100,
          Math.max(0, (used / allocationTotal) * 100),
        )
      : 0;

  const shareWidth = `${allocationShare}%` as `${number}%`;

  return (
    <View style={styles.allocationItem}>
      <View style={styles.allocationHeader}>
        <Text style={styles.allocationName}>{label}</Text>

        <Text style={styles.allocationPercent}>
          {allocationShare.toFixed(1)}% OF RESERVE
        </Text>
      </View>

      <View style={styles.allocationTrack}>
        <View
          style={[
            styles.allocationFill,
            { width: shareWidth },
          ]}
        />
      </View>

      <View style={styles.allocationMeta}>
        <Text style={styles.allocationMetaText}>
          {formatNumber(allocationTotal)} PRISM
        </Text>

        <Text style={styles.allocationUsageText}>
          {usagePercentage.toFixed(1)}% used
        </Text>
      </View>

      <View style={styles.allocationMeta}>
        <Text style={styles.allocationSubText}>
          {formatNumber(used)} used
        </Text>

        <Text style={styles.allocationSubText}>
          {formatNumber(remaining)} remaining
        </Text>
      </View>
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
  const [mode, setMode] = useState<ConnectionMode>("connecting");

  const load = useCallback(async () => {
    setRefreshing(true);
    setMode("connecting");

    try {
      const dashboard = await loadDashboard();

      setStatus(dashboard.status);
      setValidators(dashboard.validators);
      setParticipants(dashboard.participants);
      setWork(dashboard.work);
      setHumanity(dashboard.humanity);
      setReserved(dashboard.reserved);

      setError(null);
      setMode("live");
    } catch (err) {
      setStatus(DEMO_DASHBOARD.status);
      setValidators(DEMO_DASHBOARD.validators);
      setParticipants(DEMO_DASHBOARD.participants);
      setWork(DEMO_DASHBOARD.work);
      setHumanity(DEMO_DASHBOARD.humanity);
      setReserved(DEMO_DASHBOARD.reserved);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to reach Prism API",
      );

      setMode("demo");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load()}
            tintColor="#68a7ff"
            colors={["#68a7ff"]}
            progressBackgroundColor="#0b101a"
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.brandBlock}>
            <Text style={styles.logo}>PRISM</Text>

            <Text style={styles.subtitle}>
              {status
                ? `${status.network.toUpperCase()} · P2P ${status.protocol}`
                : "CONNECTING..."}
            </Text>
          </View>

          <View
            style={[
              styles.online,
              mode === "demo" && styles.demoBadge,
              mode === "connecting" && styles.connectingBadge,
            ]}
          >
            <View
              style={[
                styles.dot,
                mode === "demo" && styles.demoDot,
                mode === "connecting" && styles.connectingDot,
              ]}
            />

            <Text
              style={[
                styles.onlineText,
                mode === "demo" && styles.demoText,
                mode === "connecting" && styles.connectingText,
              ]}
            >
              {mode === "live"
                ? "LIVE"
                : mode === "demo"
                  ? "DEMO"
                  : "SYNCING"}
            </Text>
          </View>
        </View>

        <PrismProButton />

        {mode === "demo" && (
          <Card title="Demo mode">
            <Text style={styles.secondary}>
              Live Prism node unavailable. Showing bundled demo data.
              Pull down to retry.
            </Text>

            {error && (
              <Text style={styles.mono}>
                {error}
              </Text>
            )}
          </Card>
        )}

        {status && (
          <>
            <Card title="Network">
              <View style={styles.networkHeader}>
                <View style={styles.networkIdentity}>
                  <Text style={styles.networkEyebrow}>
                    ACTIVE NETWORK
                  </Text>

                  <Text style={styles.network}>
                    {status.network}
                  </Text>
                </View>

                <View
                  style={[
                    styles.healthBadge,
                    !status.chainValid && styles.healthBadgeBad,
                  ]}
                >
                  <View
                    style={[
                      styles.healthDot,
                      !status.chainValid && styles.healthDotBad,
                    ]}
                  />

                  <Text
                    style={[
                      styles.healthText,
                      !status.chainValid && styles.healthTextBad,
                    ]}
                  >
                    {status.chainValid ? "HEALTHY" : "ISSUE"}
                  </Text>
                </View>
              </View>

              <View style={styles.metrics}>
                <Metric
                  value={status.height}
                  label="HEIGHT"
                />

                <Metric
                  value={status.blocks}
                  label="BLOCKS"
                />

                <Metric
                  value={status.validators}
                  label="VALIDATORS"
                />
              </View>

              <View style={styles.chainStatus}>
                <View style={styles.chainStatusLeft}>
                  <View
                    style={[
                      styles.chainIndicator,
                      !status.chainValid && styles.chainIndicatorBad,
                    ]}
                  />

                  <Text style={styles.chainStatusLabel}>
                    CHAIN STATUS
                  </Text>
                </View>

                <Text
                  style={[
                    styles.chainStatusValue,
                    !status.chainValid && styles.chainStatusValueBad,
                  ]}
                >
                  {status.chainValid ? "VALID" : "INVALID"}
                </Text>
              </View>

              <Row
                label="Total stake"
                value={`${formatNumber(status.totalStake)} PRISM`}
              />

              <Row
                label="Total supply"
                value={`${formatNumber(status.totalSupply)} PRISM`}
              />

              <Row
                label="Node"
                value={status.version}
              />

              <Row
                label="P2P"
                value={status.protocol}
              />

              <View style={styles.hashBlock}>
                <Text style={styles.hashLabel}>
                  LAST HASH
                </Text>

                <Text style={styles.hashValue}>
                  {short(status.lastHash)}
                </Text>
              </View>
            </Card>

            {reserved && (
              <Card title="Reserved">
                <View style={styles.reservedHero}>
                  <View>
                    <Text style={styles.reservedEyebrow}>
                      RESERVED SUPPLY
                    </Text>

                    <Text style={styles.reservedAmount}>
                      {formatNumber(
                        reserved.remaining.totalRemaining,
                      )}{" "}
                      PRISM
                    </Text>

                    <Text style={styles.reservedCaption}>
                      Remaining across protocol allocations
                    </Text>
                  </View>

                  <View style={styles.reservedCount}>
                    <Text style={styles.reservedCountValue}>
                      {reserved.grants.length}
                    </Text>
                    <Text style={styles.reservedCountLabel}>
                      GRANTS
                    </Text>
                  </View>
                </View>

                <View style={styles.metrics}>
                  <Metric
                    value={formatNumber(reserved.explicitUsed)}
                    label="USED"
                  />

                  <Metric
                    value={reserved.grants.length}
                    label="GRANTS"
                  />

                  <Metric
                    value={reserved.revocations.length}
                    label="REVOKED"
                  />
                </View>

                <Row
                  label="Legacy genesis"
                  value={`${formatNumber(
                    reserved.legacyGenesis,
                  )} PRISM`}
                />

                <View style={styles.allocationSection}>
                  <Text style={styles.sectionEyebrow}>
                    ALLOCATION USAGE
                  </Text>

                  <AllocationBar
                    label="Ecosystem"
                    used={reserved.usage.ecosystem}
                    remaining={
                      reserved.remaining.ecosystemRemaining
                    }
                    reserveTotal={
                      reserved.remaining.totalRemaining +
                      reserved.explicitUsed
                    }
                  />

                  <AllocationBar
                    label="Treasury"
                    used={reserved.usage.treasury}
                    remaining={
                      reserved.remaining.treasuryRemaining
                    }
                    reserveTotal={
                      reserved.remaining.totalRemaining +
                      reserved.explicitUsed
                    }
                  />

                  <AllocationBar
                    label="Team"
                    used={reserved.usage.team}
                    remaining={
                      reserved.remaining.teamRemaining
                    }
                    reserveTotal={
                      reserved.remaining.totalRemaining +
                      reserved.explicitUsed
                    }
                  />

                  <AllocationBar
                    label="Liquidity"
                    used={reserved.usage.liquidity}
                    remaining={
                      reserved.remaining.liquidityRemaining
                    }
                    reserveTotal={
                      reserved.remaining.totalRemaining +
                      reserved.explicitUsed
                    }
                  />
                </View>

                {reserved.grants.length > 0 && (
                  <View style={styles.activitySection}>
                    <Text style={styles.sectionEyebrow}>
                      ACTIVE GRANTS
                    </Text>

                    {reserved.grants.map((grant) => (
                      <View
                        key={grant.id}
                        style={styles.entry}
                      >
                        <View style={styles.entryHeader}>
                          <Text style={styles.name}>
                            {grant.pool}
                          </Text>

                          <Text style={styles.good}>
                            {grant.status}
                          </Text>
                        </View>

                        <Text style={styles.secondary}>
                          {formatNumber(grant.amount)} PRISM
                        </Text>

                        <Text style={styles.secondary}>
                          Approvals: {grant.approvals}
                        </Text>

                        <Text style={styles.mono}>
                          {short(grant.id)}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {reserved.revocations.length > 0 && (
                  <View style={styles.activitySection}>
                    <Text style={styles.sectionEyebrow}>
                      REVOCATIONS
                    </Text>

                    {reserved.revocations.map((revocation) => (
                      <View
                        key={revocation.id}
                        style={styles.entry}
                      >
                        <View style={styles.entryHeader}>
                          <Text style={styles.name}>
                            {revocation.pool}
                          </Text>

                          <Text style={styles.revoked}>
                            {revocation.status}
                          </Text>
                        </View>

                        <Text style={styles.secondary}>
                          Approvals: {revocation.approvals}
                        </Text>

                        <Text style={styles.secondary}>
                          Grant {short(revocation.grantId)}
                        </Text>

                        <Text style={styles.mono}>
                          block {revocation.block}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </Card>
            )}

            <Card title={`Humanity (${humanity.length})`}>
              <View style={styles.identityIntro}>
                <View>
                  <Text style={styles.sectionEyebrow}>
                    HUMANITY LAYER
                  </Text>
                  <Text style={styles.identityIntroTitle}>
                    Verified humans
                  </Text>
                </View>

                <View style={styles.identityShield}>
                  <Text style={styles.identityShieldText}>
                    {humanity.length}
                  </Text>
                </View>
              </View>

              {humanity.length === 0 ? (
                <Text style={styles.emptyText}>
                  No humanity attestations yet.
                </Text>
              ) : (
                humanity.map((item, index) => (
                  <View
                    key={`${item.address}-${index}`}
                    style={styles.identityCard}
                  >
                    <View style={styles.identityHeader}>
                      <View style={styles.identityNameBlock}>
                        <Text style={styles.identityName}>
                          {item.name}
                        </Text>

                        <Text style={styles.identityProvider}>
                          {item.provider.toUpperCase()}
                        </Text>
                      </View>

                      <View style={styles.verifiedBadge}>
                        <View style={styles.verifiedDot} />
                        <Text style={styles.verifiedText}>
                          VERIFIED
                        </Text>
                      </View>
                    </View>

                    <View style={styles.identityMetaRow}>
                      <View style={styles.identityMetaItem}>
                        <Text style={styles.identityMetaLabel}>
                          ACTION
                        </Text>
                        <Text style={styles.identityMetaValue}>
                          {item.action}
                        </Text>
                      </View>

                      <View style={styles.identityMetaItem}>
                        <Text style={styles.identityMetaLabel}>
                          BLOCK
                        </Text>
                        <Text style={styles.identityMetaValue}>
                          {item.block}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.identityAddress}>
                      {short(item.address)}
                    </Text>
                  </View>
                ))
              )}
            </Card>

            <Card
              title={`Proof of Useful Participation (${participants.length})`}
            >
              <View style={styles.poupIntro}>
                <Text style={styles.sectionEyebrow}>
                  REPUTATION LAYER
                </Text>
                <Text style={styles.poupIntroText}>
                  Participation combines proposing, useful work, and
                  humanity verification.
                </Text>
              </View>

              {participants.length === 0 ? (
                <Text style={styles.emptyText}>
                  No participation data yet.
                </Text>
              ) : (
                participants.map((item, index) => (
                  <View
                    key={`${item.address}-${index}`}
                    style={styles.participantCard}
                  >
                    <View style={styles.participantHeader}>
                      <View style={styles.participantIdentity}>
                        <Text style={styles.participantName}>
                          {item.name}
                        </Text>

                        <Text style={styles.participantAddress}>
                          {short(item.address)}
                        </Text>
                      </View>

                      <View style={styles.scoreBadge}>
                        <Text style={styles.scoreValue}>
                          {item.participationScore}
                        </Text>
                        <Text style={styles.scoreLabel}>
                          SCORE
                        </Text>
                      </View>
                    </View>

                    <View style={styles.participantStats}>
                      <View style={styles.participantStat}>
                        <Text style={styles.participantStatValue}>
                          {item.blocksProposed}
                        </Text>
                        <Text style={styles.participantStatLabel}>
                          BLOCKS
                        </Text>
                      </View>

                      <View style={styles.participantStat}>
                        <Text style={styles.participantStatValue}>
                          {item.usefulWorkUnits}
                        </Text>
                        <Text style={styles.participantStatLabel}>
                          WORK UNITS
                        </Text>
                      </View>

                      <View style={styles.participantStat}>
                        <Text
                          style={[
                            styles.participantStatValue,
                            item.humanityVerified
                              ? styles.participantVerified
                              : styles.participantNotVerified,
                          ]}
                        >
                          {item.humanityVerified ? "YES" : "NO"}
                        </Text>
                        <Text style={styles.participantStatLabel}>
                          HUMAN
                        </Text>
                      </View>
                    </View>

                    <View
                      style={[
                        styles.humanityStatus,
                        !item.humanityVerified &&
                          styles.humanityStatusOff,
                      ]}
                    >
                      <View
                        style={[
                          styles.humanityStatusDot,
                          !item.humanityVerified &&
                            styles.humanityStatusDotOff,
                        ]}
                      />

                      <Text
                        style={[
                          styles.humanityStatusText,
                          !item.humanityVerified &&
                            styles.humanityStatusTextOff,
                        ]}
                      >
                        {item.humanityVerified
                          ? "HUMANITY VERIFIED"
                          : "HUMANITY NOT VERIFIED"}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </Card>

            <Card title={`Useful Work (${work.length})`}>
              <View style={styles.workIntro}>
                <View>
                  <Text style={styles.sectionEyebrow}>
                    PROOF OF USEFUL WORK
                  </Text>

                  <Text style={styles.workIntroTitle}>
                    Verified computation
                  </Text>
                </View>

                <View style={styles.workCountBadge}>
                  <Text style={styles.workCountValue}>
                    {work.filter((item) => item.verified).length}
                  </Text>
                  <Text style={styles.workCountLabel}>
                    VERIFIED
                  </Text>
                </View>
              </View>

              {work.length === 0 ? (
                <Text style={styles.emptyText}>
                  No useful work proofs yet.
                </Text>
              ) : (
                work.slice(0, 6).map((item, index) => (
                  <View
                    key={`${item.proofId}-${index}`}
                    style={styles.workCard}
                  >
                    <View style={styles.workHeader}>
                      <View style={styles.workIdentity}>
                        <Text style={styles.workWorker}>
                          {item.worker}
                        </Text>

                        <Text style={styles.workProofId}>
                          {short(item.proofId)}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.workVerifiedBadge,
                          !item.verified &&
                            styles.workInvalidBadge,
                        ]}
                      >
                        <View
                          style={[
                            styles.workVerifiedDot,
                            !item.verified &&
                              styles.workInvalidDot,
                          ]}
                        />

                        <Text
                          style={[
                            styles.workVerifiedText,
                            !item.verified &&
                              styles.workInvalidText,
                          ]}
                        >
                          {item.verified
                            ? "VERIFIED"
                            : "INVALID"}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.workTaskBlock}>
                      <Text style={styles.workTaskLabel}>
                        TASK
                      </Text>

                      <Text style={styles.workTaskText}>
                        {item.task}
                      </Text>

                      <View style={styles.workResultRow}>
                        <Text style={styles.workResultArrow}>
                          →
                        </Text>

                        <Text style={styles.workResultText}>
                          {item.result}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.workStats}>
                      <View style={styles.workStat}>
                        <Text style={styles.workStatValue}>
                          {item.block}
                        </Text>
                        <Text style={styles.workStatLabel}>
                          BLOCK
                        </Text>
                      </View>

                      <View style={styles.workStat}>
                        <Text style={styles.workStatValue}>
                          {item.score}
                        </Text>
                        <Text style={styles.workStatLabel}>
                          SCORE
                        </Text>
                      </View>

                      <View style={styles.workStat}>
                        <Text style={styles.workRewardValue}>
                          {item.reward}
                        </Text>
                        <Text style={styles.workStatLabel}>
                          PRISM REWARD
                        </Text>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </Card>

            <Card title={`Validators (${validators.length})`}>
              <View style={styles.validatorIntro}>
                <View>
                  <Text style={styles.sectionEyebrow}>
                    PROOF OF STAKE
                  </Text>

                  <Text style={styles.validatorIntroTitle}>
                    Active validator set
                  </Text>
                </View>

                <View style={styles.totalStakeBadge}>
                  <Text style={styles.totalStakeValue}>
                    {status
                      ? formatNumber(status.totalStake)
                      : "—"}
                  </Text>
                  <Text style={styles.totalStakeLabel}>
                    TOTAL STAKE
                  </Text>
                </View>
              </View>

              {validators.length === 0 ? (
                <Text style={styles.emptyText}>
                  No validators available.
                </Text>
              ) : (
                validators.map((item, index) => {
                  const totalStake = status?.totalStake ?? 0;
                  const share =
                    totalStake > 0
                      ? Math.min(
                          100,
                          Math.max(
                            0,
                            (item.stake / totalStake) * 100,
                          ),
                        )
                      : 0;
                  const shareWidth =
                    `${share}%` as `${number}%`;

                  return (
                    <View
                      key={`${item.address}-${index}`}
                      style={styles.validatorCard}
                    >
                      <View style={styles.validatorHeader}>
                        <View style={styles.validatorIdentity}>
                          <View style={styles.validatorRank}>
                            <Text style={styles.validatorRankText}>
                              {index + 1}
                            </Text>
                          </View>

                          <View style={styles.validatorNameBlock}>
                            <Text style={styles.validatorName}>
                              {item.name}
                            </Text>

                            <Text style={styles.validatorAddress}>
                              {short(item.address)}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.validatorStakeBlock}>
                          <Text style={styles.validatorStakeValue}>
                            {formatNumber(item.stake)}
                          </Text>
                          <Text style={styles.validatorStakeLabel}>
                            PRISM
                          </Text>
                        </View>
                      </View>

                      <View style={styles.validatorShareHeader}>
                        <Text style={styles.validatorShareLabel}>
                          STAKE SHARE
                        </Text>

                        <Text style={styles.validatorShareValue}>
                          {share.toFixed(1)}%
                        </Text>
                      </View>

                      <View style={styles.validatorTrack}>
                        <View
                          style={[
                            styles.validatorFill,
                            { width: shareWidth },
                          ]}
                        />
                      </View>

                      <View style={styles.validatorFooter}>
                        <View style={styles.validatorActiveDot} />
                        <Text style={styles.validatorActiveText}>
                          ACTIVE VALIDATOR
                        </Text>
                      </View>
                    </View>
                  );
                })
              )}
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
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 56,
    gap: 14,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },

  brandBlock: {
    flex: 1,
    flexShrink: 1,
  },

  logo: {
    color: "#ffffff",
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: 6,
  },

  subtitle: {
    color: "#66758d",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    marginTop: 4,
  },

  online: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0a2118",
    borderWidth: 1,
    borderColor: "#16452f",
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
    gap: 6,
  },

  dot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: "#45e391",
  },

  onlineText: {
    color: "#72e8a8",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.2,
  },

  demoBadge: {
    backgroundColor: "#2b2310",
    borderColor: "#594717",
  },

  demoDot: {
    backgroundColor: "#e1bc68",
  },

  demoText: {
    color: "#e1bc68",
  },

  connectingBadge: {
    backgroundColor: "#101827",
    borderColor: "#263653",
  },

  connectingDot: {
    backgroundColor: "#68a7ff",
  },

  connectingText: {
    color: "#8db8ff",
  },

  card: {
    backgroundColor: "#0b101a",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1b2639",
    padding: 18,
  },

  cardTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 17,
    letterSpacing: -0.3,
  },

  networkHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },

  networkIdentity: {
    flex: 1,
    flexShrink: 1,
  },

  networkEyebrow: {
    color: "#58677f",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.5,
    marginBottom: 6,
  },

  network: {
    color: "#68a7ff",
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: -0.7,
  },

  healthBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
    backgroundColor: "#0a2118",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#16452f",
  },

  healthDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: "#45e391",
  },

  healthText: {
    color: "#72e8a8",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  healthBadgeBad: {
    backgroundColor: "#301515",
    borderColor: "#633030",
  },

  healthDotBad: {
    backgroundColor: "#ff6868",
  },

  healthTextBad: {
    color: "#ff8b8b",
  },

  metrics: {
    flexDirection: "row",
    gap: 9,
    marginTop: 20,
    marginBottom: 18,
  },

  metric: {
    flex: 1,
    minHeight: 82,
    backgroundColor: "#10192a",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#15223a",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },

  metricValue: {
    color: "#ffffff",
    fontSize: 23,
    fontWeight: "900",
    letterSpacing: -0.5,
  },

  metricLabel: {
    color: "#62728a",
    fontSize: 8,
    marginTop: 6,
    fontWeight: "900",
    letterSpacing: 0.8,
    textAlign: "center",
  },

  chainStatus: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#0d1718",
    borderWidth: 1,
    borderColor: "#17372d",
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 11,
    marginBottom: 5,
  },

  chainStatusLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  chainIndicator: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: "#45e391",
  },

  chainIndicatorBad: {
    backgroundColor: "#ff6868",
  },

  chainStatusLabel: {
    color: "#718096",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
  },

  chainStatusValue: {
    color: "#72e8a8",
    fontSize: 10,
    fontWeight: "900",
  },

  chainStatusValueBad: {
    color: "#ff8b8b",
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#222c3c",
    paddingVertical: 11,
  },

  label: {
    color: "#77869c",
    fontSize: 13,
    flexShrink: 1,
  },

  value: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
    textAlign: "right",
    flexShrink: 1,
  },

  hashBlock: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#222c3c",
    paddingTop: 14,
    marginTop: 2,
  },

  hashLabel: {
    color: "#56667e",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.5,
    marginBottom: 7,
  },

  hashValue: {
    color: "#718198",
    fontSize: 11,
    fontFamily: "monospace",
  },

  reservedHero: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    backgroundColor: "#0f1726",
    borderWidth: 1,
    borderColor: "#1a2942",
    borderRadius: 16,
    padding: 15,
  },

  reservedEyebrow: {
    color: "#65758e",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.4,
    marginBottom: 6,
  },

  reservedAmount: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.4,
  },

  reservedCaption: {
    color: "#718096",
    fontSize: 10,
    marginTop: 4,
  },

  reservedCount: {
    minWidth: 64,
    minHeight: 64,
    borderRadius: 16,
    backgroundColor: "#111d30",
    borderWidth: 1,
    borderColor: "#1b2e4d",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },

  reservedCountValue: {
    color: "#68a7ff",
    fontSize: 20,
    fontWeight: "900",
  },

  reservedCountLabel: {
    color: "#62728a",
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1,
    marginTop: 3,
  },

  allocationSection: {
    marginTop: 18,
    gap: 14,
  },

  sectionEyebrow: {
    color: "#58677f",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.5,
    marginBottom: 2,
  },

  allocationItem: {
    gap: 7,
  },

  allocationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  allocationName: {
    color: "#e7ebf3",
    fontSize: 12,
    fontWeight: "800",
  },

  allocationPercent: {
    color: "#68a7ff",
    fontSize: 10,
    fontWeight: "900",
  },

  allocationTrack: {
    height: 8,
    backgroundColor: "#111a2a",
    borderRadius: 999,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#18263d",
  },

  allocationFill: {
    height: "100%",
    backgroundColor: "#68a7ff",
    borderRadius: 999,
  },

  allocationMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },

  allocationMetaText: {
    color: "#dfe6f3",
    fontSize: 10,
    fontWeight: "800",
  },

  allocationUsageText: {
    color: "#68a7ff",
    fontSize: 9,
    fontWeight: "900",
  },

  allocationSubText: {
    color: "#66758d",
    fontSize: 9,
  },

  activitySection: {
    marginTop: 20,
  },

  identityIntro: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
  },

  identityIntroTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900",
    marginTop: 5,
  },

  identityShield: {
    minWidth: 48,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: "#0b2118",
    borderWidth: 1,
    borderColor: "#16452f",
    alignItems: "center",
    justifyContent: "center",
  },

  identityShieldText: {
    color: "#72e8a8",
    fontSize: 18,
    fontWeight: "900",
  },

  identityCard: {
    backgroundColor: "#0f1724",
    borderWidth: 1,
    borderColor: "#1b2a40",
    borderRadius: 16,
    padding: 14,
    marginTop: 10,
  },

  identityHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  identityNameBlock: {
    flex: 1,
  },

  identityName: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900",
  },

  identityProvider: {
    color: "#68a7ff",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.1,
    marginTop: 4,
  },

  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#0a2118",
    borderWidth: 1,
    borderColor: "#16452f",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },

  verifiedDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: "#45e391",
  },

  verifiedText: {
    color: "#72e8a8",
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  identityMetaRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 13,
  },

  identityMetaItem: {
    flex: 1,
    backgroundColor: "#111c2d",
    borderRadius: 11,
    padding: 10,
  },

  identityMetaLabel: {
    color: "#5f6f87",
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1,
  },

  identityMetaValue: {
    color: "#e5eaf3",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 4,
  },

  identityAddress: {
    color: "#687790",
    fontFamily: "monospace",
    fontSize: 10,
    marginTop: 11,
  },

  poupIntro: {
    marginBottom: 4,
  },

  poupIntroText: {
    color: "#77869c",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 5,
  },

  participantCard: {
    backgroundColor: "#0f1724",
    borderWidth: 1,
    borderColor: "#1b2a40",
    borderRadius: 16,
    padding: 14,
    marginTop: 12,
  },

  participantHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  participantIdentity: {
    flex: 1,
  },

  participantName: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900",
  },

  participantAddress: {
    color: "#687790",
    fontFamily: "monospace",
    fontSize: 9,
    marginTop: 4,
  },

  scoreBadge: {
    minWidth: 58,
    minHeight: 58,
    borderRadius: 15,
    backgroundColor: "#111d30",
    borderWidth: 1,
    borderColor: "#21375b",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },

  scoreValue: {
    color: "#68a7ff",
    fontSize: 20,
    fontWeight: "900",
  },

  scoreLabel: {
    color: "#61728b",
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1,
    marginTop: 2,
  },

  participantStats: {
    flexDirection: "row",
    gap: 8,
    marginTop: 13,
  },

  participantStat: {
    flex: 1,
    minHeight: 61,
    backgroundColor: "#111c2d",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },

  participantStatValue: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900",
  },

  participantStatLabel: {
    color: "#607087",
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 0.8,
    marginTop: 4,
    textAlign: "center",
  },

  participantVerified: {
    color: "#72e8a8",
  },

  participantNotVerified: {
    color: "#ff8b8b",
  },

  humanityStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#0a2118",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 10,
  },

  humanityStatusOff: {
    backgroundColor: "#2b1719",
  },

  humanityStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: "#45e391",
  },

  humanityStatusDotOff: {
    backgroundColor: "#ff737e",
  },

  humanityStatusText: {
    color: "#72e8a8",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  humanityStatusTextOff: {
    color: "#ff8b8b",
  },

  workIntro: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
  },

  workIntroTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900",
    marginTop: 5,
  },

  workCountBadge: {
    minWidth: 58,
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: "#0a2118",
    borderWidth: 1,
    borderColor: "#16452f",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },

  workCountValue: {
    color: "#72e8a8",
    fontSize: 18,
    fontWeight: "900",
  },

  workCountLabel: {
    color: "#5d9f7b",
    fontSize: 6,
    fontWeight: "900",
    letterSpacing: 0.8,
    marginTop: 2,
  },

  workCard: {
    backgroundColor: "#0f1724",
    borderWidth: 1,
    borderColor: "#1b2a40",
    borderRadius: 16,
    padding: 14,
    marginTop: 12,
  },

  workHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  workIdentity: {
    flex: 1,
  },

  workWorker: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900",
  },

  workProofId: {
    color: "#687790",
    fontFamily: "monospace",
    fontSize: 9,
    marginTop: 4,
  },

  workVerifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#0a2118",
    borderWidth: 1,
    borderColor: "#16452f",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },

  workInvalidBadge: {
    backgroundColor: "#2b1719",
    borderColor: "#633038",
  },

  workVerifiedDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: "#45e391",
  },

  workInvalidDot: {
    backgroundColor: "#ff737e",
  },

  workVerifiedText: {
    color: "#72e8a8",
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  workInvalidText: {
    color: "#ff8b8b",
  },

  workTaskBlock: {
    backgroundColor: "#111c2d",
    borderRadius: 12,
    padding: 12,
    marginTop: 13,
  },

  workTaskLabel: {
    color: "#5f6f87",
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1,
  },

  workTaskText: {
    color: "#e8edf6",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 6,
  },

  workResultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 8,
  },

  workResultArrow: {
    color: "#68a7ff",
    fontSize: 14,
    fontWeight: "900",
  },

  workResultText: {
    color: "#8db8ff",
    fontSize: 12,
    fontWeight: "800",
    flexShrink: 1,
  },

  workStats: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },

  workStat: {
    flex: 1,
    minHeight: 62,
    backgroundColor: "#111c2d",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },

  workStatValue: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900",
  },

  workRewardValue: {
    color: "#e1bc68",
    fontSize: 15,
    fontWeight: "900",
  },

  workStatLabel: {
    color: "#607087",
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 0.7,
    marginTop: 4,
    textAlign: "center",
  },

  validatorIntro: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
  },

  validatorIntroTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900",
    marginTop: 5,
  },

  totalStakeBadge: {
    minWidth: 78,
    minHeight: 54,
    borderRadius: 14,
    backgroundColor: "#211c0e",
    borderWidth: 1,
    borderColor: "#4d4020",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 9,
  },

  totalStakeValue: {
    color: "#e1bc68",
    fontSize: 15,
    fontWeight: "900",
  },

  totalStakeLabel: {
    color: "#8b7946",
    fontSize: 6,
    fontWeight: "900",
    letterSpacing: 0.8,
    marginTop: 3,
  },

  validatorCard: {
    backgroundColor: "#0f1724",
    borderWidth: 1,
    borderColor: "#1b2a40",
    borderRadius: 16,
    padding: 14,
    marginTop: 12,
  },

  validatorHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  validatorIdentity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },

  validatorRank: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "#111d30",
    borderWidth: 1,
    borderColor: "#21375b",
    alignItems: "center",
    justifyContent: "center",
  },

  validatorRankText: {
    color: "#68a7ff",
    fontSize: 13,
    fontWeight: "900",
  },

  validatorNameBlock: {
    flex: 1,
  },

  validatorName: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900",
  },

  validatorAddress: {
    color: "#687790",
    fontFamily: "monospace",
    fontSize: 9,
    marginTop: 4,
  },

  validatorStakeBlock: {
    alignItems: "flex-end",
  },

  validatorStakeValue: {
    color: "#e1bc68",
    fontSize: 17,
    fontWeight: "900",
  },

  validatorStakeLabel: {
    color: "#8b7946",
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1,
    marginTop: 2,
  },

  validatorShareHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 15,
    marginBottom: 7,
  },

  validatorShareLabel: {
    color: "#607087",
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1,
  },

  validatorShareValue: {
    color: "#68a7ff",
    fontSize: 9,
    fontWeight: "900",
  },

  validatorTrack: {
    height: 8,
    backgroundColor: "#111a2a",
    borderRadius: 999,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#18263d",
  },

  validatorFill: {
    height: "100%",
    backgroundColor: "#68a7ff",
    borderRadius: 999,
  },

  validatorFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },

  validatorActiveDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: "#45e391",
  },

  validatorActiveText: {
    color: "#72e8a8",
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  entry: {
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#222c3c",
  },

  entryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },

  name: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 15,
    flexShrink: 1,
  },

  secondary: {
    color: "#8190a6",
    marginTop: 5,
    fontSize: 12,
    lineHeight: 17,
  },

  mono: {
    color: "#687790",
    fontFamily: "monospace",
    fontSize: 10,
    marginTop: 5,
  },

  emptyText: {
    color: "#687790",
    fontSize: 12,
    lineHeight: 18,
  },

  score: {
    color: "#68a7ff",
    fontWeight: "900",
    fontSize: 12,
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
    fontSize: 12,
  },

  footer: {
    color: "#46546b",
    textAlign: "center",
    fontSize: 10,
    marginTop: 8,
    letterSpacing: 0.3,
  },
});
