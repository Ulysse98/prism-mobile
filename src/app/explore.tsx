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

import { loadDashboard } from "../api/client";
import { DEMO_DASHBOARD } from "../api/demo";

type Dashboard = Awaited<ReturnType<typeof loadDashboard>>;
type ConnectionMode = "connecting" | "live" | "demo";

function formatNumber(value: number) {
  return value.toLocaleString();
}

function Pill({
  label,
  tone = "blue",
}: {
  label: string;
  tone?: "blue" | "green" | "gold" | "purple";
}) {
  return (
    <View
      style={[
        styles.pill,
        tone === "green" && styles.pillGreen,
        tone === "gold" && styles.pillGold,
        tone === "purple" && styles.pillPurple,
      ]}
    >
      <Text
        style={[
          styles.pillText,
          tone === "green" && styles.pillTextGreen,
          tone === "gold" && styles.pillTextGold,
          tone === "purple" && styles.pillTextPurple,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function Stat({
  value,
  label,
}: {
  value: string | number;
  label: string;
}) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ModuleCard({
  eyebrow,
  title,
  description,
  value,
  valueLabel,
  tone,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  value: string | number;
  valueLabel: string;
  tone: "blue" | "green" | "gold" | "purple";
  children?: ReactNode;
}) {
  return (
    <View style={styles.moduleCard}>
      <View style={styles.moduleHeader}>
        <View style={styles.moduleTitleBlock}>
          <Text style={styles.moduleEyebrow}>{eyebrow}</Text>
          <Text style={styles.moduleTitle}>{title}</Text>
          <Text style={styles.moduleDescription}>{description}</Text>
        </View>

        <View
          style={[
            styles.moduleValue,
            tone === "green" && styles.moduleValueGreen,
            tone === "gold" && styles.moduleValueGold,
            tone === "purple" && styles.moduleValuePurple,
          ]}
        >
          <Text
            style={[
              styles.moduleValueText,
              tone === "green" && styles.moduleValueTextGreen,
              tone === "gold" && styles.moduleValueTextGold,
              tone === "purple" && styles.moduleValueTextPurple,
            ]}
          >
            {value}
          </Text>

          <Text style={styles.moduleValueLabel}>{valueLabel}</Text>
        </View>
      </View>

      {children}
    </View>
  );
}

export default function ExploreScreen() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [mode, setMode] = useState<ConnectionMode>("connecting");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    setMode("connecting");

    try {
      const data = await loadDashboard();
      setDashboard(data);
      setMode("live");
    } catch {
      setDashboard(DEMO_DASHBOARD as Dashboard);
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

  const status = dashboard?.status;
  const validators = dashboard?.validators ?? [];
  const humanity = dashboard?.humanity ?? [];
  const participants = dashboard?.participants ?? [];
  const work = dashboard?.work ?? [];
  const reserved = dashboard?.reserved ?? null;

  const verifiedWork = work.filter((item) => item.verified).length;
  const verifiedHumans = humanity.length;
  const averageScore =
    participants.length > 0
      ? Math.round(
          participants.reduce(
            (sum, item) => sum + item.participationScore,
            0,
          ) / participants.length,
        )
      : 0;

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
          <View>
            <Text style={styles.logo}>EXPLORE</Text>
            <Text style={styles.subtitle}>
              PRISM PROTOCOL MODULES
            </Text>
          </View>

          <View
            style={[
              styles.connectionBadge,
              mode === "demo" && styles.connectionBadgeDemo,
            ]}
          >
            <View
              style={[
                styles.connectionDot,
                mode === "demo" && styles.connectionDotDemo,
              ]}
            />
            <Text
              style={[
                styles.connectionText,
                mode === "demo" && styles.connectionTextDemo,
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

        <View style={styles.hero}>
          <Text style={styles.heroEyebrow}>NETWORK OVERVIEW</Text>

          <Text style={styles.heroTitle}>
            {status?.network ?? "Prism"}
          </Text>

          <Text style={styles.heroText}>
            Explore the protocol layers that power Prism:
            stake, useful work, humanity, participation,
            and reserved token allocations.
          </Text>

          <View style={styles.heroStats}>
            <Stat
              value={status?.validators ?? 0}
              label="VALIDATORS"
            />
            <Stat
              value={verifiedHumans}
              label="HUMANS"
            />
            <Stat
              value={verifiedWork}
              label="WORK PROOFS"
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>
          PROTOCOL LAYERS
        </Text>

        <ModuleCard
          eyebrow="PROOF OF STAKE"
          title="Validators"
          description="Capital-secured consensus and active validator participation."
          value={validators.length}
          valueLabel="ACTIVE"
          tone="gold"
        >
          <View style={styles.detailRow}>
            <Pill label="CONSENSUS" tone="gold" />
            <Text style={styles.detailText}>
              {formatNumber(status?.totalStake ?? 0)} PRISM staked
            </Text>
          </View>
        </ModuleCard>

        <ModuleCard
          eyebrow="HUMANITY LAYER"
          title="Humanity"
          description="World ID-backed verification used to gate human participation."
          value={verifiedHumans}
          valueLabel="VERIFIED"
          tone="green"
        >
          <View style={styles.detailRow}>
            <Pill label="WORLD ID" tone="green" />
            <Text style={styles.detailText}>
              On-chain humanity registry
            </Text>
          </View>
        </ModuleCard>

        <ModuleCard
          eyebrow="PROOF OF USEFUL WORK"
          title="Useful Work"
          description="Verified computation contributes measurable value to the network."
          value={verifiedWork}
          valueLabel="PROOFS"
          tone="blue"
        >
          <View style={styles.detailRow}>
            <Pill label="COMPUTE" />
            <Text style={styles.detailText}>
              {work.length} total work entries
            </Text>
          </View>
        </ModuleCard>

        <ModuleCard
          eyebrow="PROOF OF USEFUL PARTICIPATION"
          title="Participation"
          description="Reputation combines proposing, useful work, and humanity verification."
          value={averageScore}
          valueLabel="AVG SCORE"
          tone="purple"
        >
          <View style={styles.detailRow}>
            <Pill label="REPUTATION" tone="purple" />
            <Text style={styles.detailText}>
              {participants.length} participants ranked
            </Text>
          </View>
        </ModuleCard>

        <ModuleCard
          eyebrow="TOKENOMICS"
          title="Reserved Supply"
          description="Protocol-controlled allocations for ecosystem, treasury, team, and liquidity."
          value={
            reserved
              ? `${(
                  reserved.remaining.totalRemaining / 1_000_000
                ).toFixed(0)}M`
              : "0M"
          }
          valueLabel="PRISM"
          tone="blue"
        >
          <View style={styles.allocationGrid}>
            <View style={styles.allocationMini}>
              <Text style={styles.allocationMiniValue}>
                {reserved
                  ? formatNumber(
                      reserved.remaining.ecosystemRemaining,
                    )
                  : "0"}
              </Text>
              <Text style={styles.allocationMiniLabel}>
                ECOSYSTEM
              </Text>
            </View>

            <View style={styles.allocationMini}>
              <Text style={styles.allocationMiniValue}>
                {reserved
                  ? formatNumber(
                      reserved.remaining.treasuryRemaining,
                    )
                  : "0"}
              </Text>
              <Text style={styles.allocationMiniLabel}>
                TREASURY
              </Text>
            </View>
          </View>
        </ModuleCard>

        <View style={styles.architecture}>
          <Text style={styles.architectureEyebrow}>
            PRISM ARCHITECTURE
          </Text>

          <Text style={styles.architectureTitle}>
            Capital + Work + Humanity
          </Text>

          <Text style={styles.architectureText}>
            Prism is designed around three complementary
            contribution layers rather than a single source
            of network influence.
          </Text>

          <View style={styles.architectureFlow}>
            <View style={styles.flowNode}>
              <Text style={styles.flowNodeLabel}>PoS</Text>
              <Text style={styles.flowNodeSub}>CAPITAL</Text>
            </View>

            <Text style={styles.flowPlus}>+</Text>

            <View style={styles.flowNode}>
              <Text style={styles.flowNodeLabel}>PoUW</Text>
              <Text style={styles.flowNodeSub}>WORK</Text>
            </View>

            <Text style={styles.flowPlus}>+</Text>

            <View style={styles.flowNode}>
              <Text style={styles.flowNodeLabel}>PoUP</Text>
              <Text style={styles.flowNodeSub}>HUMAN</Text>
            </View>
          </View>
        </View>

        <Text style={styles.footer}>
          Prism · Protocol Explorer
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
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  logo: {
    color: "#ffffff",
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: 4,
  },

  subtitle: {
    color: "#66758d",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.8,
    marginTop: 4,
  },

  connectionBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#0a2118",
    borderWidth: 1,
    borderColor: "#16452f",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  connectionBadgeDemo: {
    backgroundColor: "#2b2310",
    borderColor: "#594717",
  },

  connectionDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: "#45e391",
  },

  connectionDotDemo: {
    backgroundColor: "#e1bc68",
  },

  connectionText: {
    color: "#72e8a8",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1,
  },

  connectionTextDemo: {
    color: "#e1bc68",
  },

  hero: {
    backgroundColor: "#0b101a",
    borderWidth: 1,
    borderColor: "#1b2639",
    borderRadius: 20,
    padding: 18,
  },

  heroEyebrow: {
    color: "#58677f",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.5,
  },

  heroTitle: {
    color: "#68a7ff",
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.7,
    marginTop: 7,
  },

  heroText: {
    color: "#7b899f",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 9,
  },

  heroStats: {
    flexDirection: "row",
    gap: 8,
    marginTop: 18,
  },

  stat: {
    flex: 1,
    minHeight: 72,
    backgroundColor: "#10192a",
    borderWidth: 1,
    borderColor: "#15223a",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },

  statValue: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "900",
  },

  statLabel: {
    color: "#62728a",
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 0.7,
    marginTop: 5,
    textAlign: "center",
  },

  sectionTitle: {
    color: "#58677f",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.6,
    marginTop: 4,
    marginLeft: 2,
  },

  moduleCard: {
    backgroundColor: "#0b101a",
    borderWidth: 1,
    borderColor: "#1b2639",
    borderRadius: 18,
    padding: 16,
  },

  moduleHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
  },

  moduleTitleBlock: {
    flex: 1,
  },

  moduleEyebrow: {
    color: "#58677f",
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1.2,
  },

  moduleTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 5,
  },

  moduleDescription: {
    color: "#77869c",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 6,
  },

  moduleValue: {
    minWidth: 66,
    minHeight: 66,
    borderRadius: 16,
    backgroundColor: "#111d30",
    borderWidth: 1,
    borderColor: "#21375b",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },

  moduleValueGreen: {
    backgroundColor: "#0a2118",
    borderColor: "#16452f",
  },

  moduleValueGold: {
    backgroundColor: "#211c0e",
    borderColor: "#4d4020",
  },

  moduleValuePurple: {
    backgroundColor: "#17162a",
    borderColor: "#39365d",
  },

  moduleValueText: {
    color: "#68a7ff",
    fontSize: 20,
    fontWeight: "900",
  },

  moduleValueTextGreen: {
    color: "#72e8a8",
  },

  moduleValueTextGold: {
    color: "#e1bc68",
  },

  moduleValueTextPurple: {
    color: "#a9afff",
  },

  moduleValueLabel: {
    color: "#62728a",
    fontSize: 6,
    fontWeight: "900",
    letterSpacing: 0.8,
    marginTop: 3,
    textAlign: "center",
  },

  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
  },

  detailText: {
    color: "#6f7e95",
    fontSize: 10,
    flexShrink: 1,
  },

  pill: {
    backgroundColor: "#111d30",
    borderWidth: 1,
    borderColor: "#21375b",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  pillGreen: {
    backgroundColor: "#0a2118",
    borderColor: "#16452f",
  },

  pillGold: {
    backgroundColor: "#211c0e",
    borderColor: "#4d4020",
  },

  pillPurple: {
    backgroundColor: "#17162a",
    borderColor: "#39365d",
  },

  pillText: {
    color: "#68a7ff",
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  pillTextGreen: {
    color: "#72e8a8",
  },

  pillTextGold: {
    color: "#e1bc68",
  },

  pillTextPurple: {
    color: "#a9afff",
  },

  allocationGrid: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
  },

  allocationMini: {
    flex: 1,
    backgroundColor: "#10192a",
    borderRadius: 12,
    padding: 11,
  },

  allocationMiniValue: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "900",
  },

  allocationMiniLabel: {
    color: "#607087",
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 0.8,
    marginTop: 5,
  },

  architecture: {
    backgroundColor: "#0d1321",
    borderWidth: 1,
    borderColor: "#34355c",
    borderRadius: 20,
    padding: 18,
    marginTop: 4,
  },

  architectureEyebrow: {
    color: "#777ba6",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.5,
  },

  architectureTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "900",
    marginTop: 7,
  },

  architectureText: {
    color: "#7d86a0",
    fontSize: 11,
    lineHeight: 17,
    marginTop: 7,
  },

  architectureFlow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 7,
    marginTop: 18,
  },

  flowNode: {
    flex: 1,
    minHeight: 68,
    backgroundColor: "#14172a",
    borderWidth: 1,
    borderColor: "#30345a",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  flowNodeLabel: {
    color: "#a9afff",
    fontSize: 15,
    fontWeight: "900",
  },

  flowNodeSub: {
    color: "#666b91",
    fontSize: 6,
    fontWeight: "900",
    letterSpacing: 0.8,
    marginTop: 4,
  },

  flowPlus: {
    color: "#576079",
    fontSize: 14,
    fontWeight: "900",
  },

  footer: {
    color: "#46546b",
    textAlign: "center",
    fontSize: 10,
    marginTop: 8,
    letterSpacing: 0.3,
  },
});
