import { useFocusEffect } from "expo-router";
import {
  useCallback,
  useMemo,
  useState,
} from "react";
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

type ConnectionMode =
  | "connecting"
  | "live"
  | "demo";

function formatNumber(value: number) {
  return value.toLocaleString();
}

function short(value?: string) {
  if (!value) {
    return "—";
  }

  if (value.length <= 18) {
    return value;
  }

  return `${value.slice(0, 9)}…${value.slice(-6)}`;
}

function formatTask(value: string) {
  return value
    .replace(/_/g, " ")
    .toUpperCase();
}

function StatusBadge({
  mode,
}: {
  mode: ConnectionMode;
}) {
  const text =
    mode === "live"
      ? "LIVE"
      : mode === "demo"
        ? "DEMO"
        : "SYNCING";

  return (
    <View
      style={[
        styles.statusBadge,
        mode === "demo" &&
          styles.statusBadgeDemo,
        mode === "connecting" &&
          styles.statusBadgeConnecting,
      ]}
    >
      <View
        style={[
          styles.statusDot,
          mode === "demo" &&
            styles.statusDotDemo,
          mode === "connecting" &&
            styles.statusDotConnecting,
        ]}
      />

      <Text
        style={[
          styles.statusText,
          mode === "demo" &&
            styles.statusTextDemo,
          mode === "connecting" &&
            styles.statusTextConnecting,
        ]}
      >
        {text}
      </Text>
    </View>
  );
}

function MetricCard({
  value,
  label,
  tone = "default",
}: {
  value: string | number;
  label: string;
  tone?:
    | "default"
    | "blue"
    | "green"
    | "gold"
    | "purple";
}) {
  return (
    <View style={styles.metricCard}>
      <Text
        style={[
          styles.metricValue,
          tone === "blue" &&
            styles.blue,
          tone === "green" &&
            styles.green,
          tone === "gold" &&
            styles.gold,
          tone === "purple" &&
            styles.purple,
        ]}
      >
        {value}
      </Text>

      <Text style={styles.metricLabel}>
        {label}
      </Text>
    </View>
  );
}

export default function HomeScreen() {
  const [status, setStatus] =
    useState<PrismStatus | null>(
      null,
    );

  const [validators, setValidators] =
    useState<PrismValidator[]>([]);

  const [
    participants,
    setParticipants,
  ] = useState<PrismParticipant[]>(
    [],
  );

  const [work, setWork] =
    useState<PrismWorkEntry[]>([]);

  const [humanity, setHumanity] =
    useState<PrismHumanityEntry[]>(
      [],
    );

  const [reserved, setReserved] =
    useState<PrismReserved | null>(
      null,
    );

  const [error, setError] =
    useState<string | null>(null);

  const [refreshing, setRefreshing] =
    useState(false);

  const [mode, setMode] =
    useState<ConnectionMode>(
      "connecting",
    );

  const load =
    useCallback(async () => {
      setRefreshing(true);
      setMode("connecting");

      try {
        const dashboard =
          await loadDashboard();

        setStatus(dashboard.status);
        setValidators(
          dashboard.validators,
        );
        setParticipants(
          dashboard.participants,
        );
        setWork(dashboard.work);
        setHumanity(
          dashboard.humanity,
        );
        setReserved(
          dashboard.reserved,
        );

        setError(null);
        setMode("live");
      } catch (err) {
        console.warn(
          "[Prism Home] live dashboard unavailable",
          err,
        );

        setStatus(
          DEMO_DASHBOARD.status,
        );

        setValidators(
          DEMO_DASHBOARD.validators,
        );

        setParticipants(
          DEMO_DASHBOARD.participants,
        );

        setWork(
          DEMO_DASHBOARD.work,
        );

        setHumanity(
          DEMO_DASHBOARD.humanity,
        );

        setReserved(
          DEMO_DASHBOARD.reserved,
        );

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

  const aliceParticipant =
    useMemo(
      () =>
        participants.find(
          (entry) =>
            entry.name === "Alice",
        ) ?? null,
      [participants],
    );

  const aliceValidator =
    useMemo(
      () =>
        validators.find(
          (entry) =>
            entry.name === "Alice",
        ) ?? null,
      [validators],
    );

  const aliceHumanity =
    useMemo(
      () =>
        humanity.find(
          (entry) =>
            entry.name === "Alice",
        ) ?? null,
      [humanity],
    );

  const aliceWork =
    useMemo(
      () =>
        work
          .filter(
            (entry) =>
              entry.worker ===
                "Alice" &&
              entry.verified,
          )
          .sort(
            (a, b) =>
              b.block - a.block,
          ),
      [work],
    );

  const aliceRewards =
    useMemo(
      () =>
        aliceWork.reduce(
          (sum, entry) =>
            sum + entry.reward,
          0,
        ),
      [aliceWork],
    );

  const latestWork =
    aliceWork[0] ?? null;

  const networkHealthy =
    status?.chainValid ?? false;

  const reservedRemaining =
    reserved?.remaining
      .totalRemaining ?? 0;

  return (
    <SafeAreaView
      style={styles.safe}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={
          styles.content
        }
        showsVerticalScrollIndicator={
          false
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() =>
              void load()
            }
            tintColor="#68a7ff"
            colors={["#68a7ff"]}
            progressBackgroundColor="#0b101a"
          />
        }
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text
              style={
                styles.headerEyebrow
              }
            >
              PRISM NETWORK
            </Text>

            <Text
              style={
                styles.headerTitle
              }
            >
              Home
            </Text>

            <Text
              style={
                styles.headerSubtitle
              }
            >
              Welcome back, Alice
            </Text>
          </View>

          <StatusBadge mode={mode} />
        </View>

        <PrismProButton />

        {mode === "demo" && (
          <View
            style={
              styles.demoCard
            }
          >
            <Text
              style={
                styles.demoTitle
              }
            >
              DEMO MODE
            </Text>

            <Text
              style={
                styles.demoText
              }
            >
              Prism Devnet could not
              be reached. Showing
              bundled demo data.
            </Text>

            {error && (
              <Text
                style={
                  styles.demoError
                }
              >
                {error}
              </Text>
            )}
          </View>
        )}

        <View
          style={
            styles.profileHero
          }
        >
          <View
            style={
              styles.profileTop
            }
          >
            <View>
              <Text
                style={
                  styles.profileEyebrow
                }
              >
                ACTIVE IDENTITY
              </Text>

              <Text
                style={
                  styles.profileName
                }
              >
                Alice
              </Text>

              <Text
                style={
                  styles.profileAddress
                }
              >
                {short(
                  aliceParticipant
                    ?.address ??
                    aliceValidator
                      ?.address,
                )}
              </Text>
            </View>

            <View
              style={[
                styles.identityBadge,
                !aliceHumanity &&
                  styles.identityBadgeOff,
              ]}
            >
              <Text
                style={[
                  styles.identityIcon,
                  !aliceHumanity &&
                    styles.identityIconOff,
                ]}
              >
                ✓
              </Text>

              <Text
                style={[
                  styles.identityText,
                  !aliceHumanity &&
                    styles.identityTextOff,
                ]}
              >
                {aliceHumanity
                  ? "VERIFIED"
                  : "UNVERIFIED"}
              </Text>
            </View>
          </View>

          <View
            style={
              styles.earningsCard
            }
          >
            <Text
              style={
                styles.earningsLabel
              }
            >
              PoUW EARNED
            </Text>

            <View
              style={
                styles.earningsRow
              }
            >
              <Text
                style={
                  styles.earningsValue
                }
              >
                +{aliceRewards}
              </Text>

              <Text
                style={
                  styles.earningsUnit
                }
              >
                PRISM
              </Text>
            </View>

            <Text
              style={
                styles.earningsMeta
              }
            >
              {aliceWork.length} verified
              useful work proofs
            </Text>
          </View>

          <View
            style={
              styles.profileMetrics
            }
          >
            <MetricCard
              value={
                aliceParticipant
                  ?.participationScore ??
                0
              }
              label="PoUP SCORE"
              tone="purple"
            />

            <MetricCard
              value={
                aliceValidator?.stake ??
                0
              }
              label="STAKE"
              tone="gold"
            />

            <MetricCard
              value={
                aliceParticipant
                  ?.usefulWorkUnits ??
                0
              }
              label="WORK UNITS"
              tone="blue"
            />
          </View>
        </View>

        <View
          style={
            styles.sectionHeader
          }
        >
          <View>
            <Text
              style={
                styles.sectionEyebrow
              }
            >
              NETWORK
            </Text>

            <Text
              style={
                styles.sectionTitle
              }
            >
              Prism Devnet
            </Text>
          </View>

          <View
            style={[
              styles.healthBadge,
              !networkHealthy &&
                styles.healthBadgeBad,
            ]}
          >
            <View
              style={[
                styles.healthDot,
                !networkHealthy &&
                  styles.healthDotBad,
              ]}
            />

            <Text
              style={[
                styles.healthText,
                !networkHealthy &&
                  styles.healthTextBad,
              ]}
            >
              {networkHealthy
                ? "HEALTHY"
                : "ISSUE"}
            </Text>
          </View>
        </View>

        <View
          style={
            styles.networkCard
          }
        >
          <View
            style={
              styles.networkTop
            }
          >
            <View>
              <Text
                style={
                  styles.networkEyebrow
                }
              >
                CURRENT HEIGHT
              </Text>

              <Text
                style={
                  styles.networkHeight
                }
              >
                {status?.height ?? 0}
              </Text>
            </View>

            <View
              style={
                styles.protocolBadge
              }
            >
              <Text
                style={
                  styles.protocolText
                }
              >
                P2P{" "}
                {status?.protocol ??
                  "—"}
              </Text>
            </View>
          </View>

          <View
            style={
              styles.networkMetrics
            }
          >
            <MetricCard
              value={
                status?.blocks ?? 0
              }
              label="BLOCKS"
            />

            <MetricCard
              value={
                status?.validators ??
                0
              }
              label="VALIDATORS"
              tone="gold"
            />

            <MetricCard
              value={
                humanity.length
              }
              label="HUMANS"
              tone="green"
            />
          </View>

          <View
            style={
              styles.networkMeta
            }
          >
            <View
              style={
                styles.networkMetaRow
              }
            >
              <Text
                style={
                  styles.networkMetaLabel
                }
              >
                NODE
              </Text>

              <Text
                style={
                  styles.networkMetaValue
                }
              >
                {status?.version ??
                  "—"}
              </Text>
            </View>

            <View
              style={
                styles.networkMetaRow
              }
            >
              <Text
                style={
                  styles.networkMetaLabel
                }
              >
                TOTAL STAKE
              </Text>

              <Text
                style={
                  styles.networkMetaValue
                }
              >
                {formatNumber(
                  status?.totalStake ??
                    0,
                )}{" "}
                PRISM
              </Text>
            </View>

            <View
              style={
                styles.networkMetaRow
              }
            >
              <Text
                style={
                  styles.networkMetaLabel
                }
              >
                TOTAL SUPPLY
              </Text>

              <Text
                style={
                  styles.networkMetaValue
                }
              >
                {formatNumber(
                  status?.totalSupply ??
                    0,
                )}{" "}
                PRISM
              </Text>
            </View>
          </View>

          <View
            style={styles.hashStrip}
          >
            <Text
              style={
                styles.hashLabel
              }
            >
              LAST HASH
            </Text>

            <Text
              style={
                styles.hashValue
              }
              numberOfLines={1}
            >
              {short(
                status?.lastHash,
              )}
            </Text>
          </View>
        </View>

        <View
          style={
            styles.sectionHeader
          }
        >
          <View>
            <Text
              style={
                styles.sectionEyebrow
              }
            >
              ACTIVITY
            </Text>

            <Text
              style={
                styles.sectionTitle
              }
            >
              Recent rewards
            </Text>
          </View>

          <Text
            style={
              styles.activityCount
            }
          >
            {aliceWork.length}
          </Text>
        </View>

        <View
          style={
            styles.activityCard
          }
        >
          {aliceWork.length === 0 ? (
            <Text
              style={
                styles.emptyText
              }
            >
              No verified PoUW rewards
              yet.
            </Text>
          ) : (
            aliceWork
              .slice(0, 5)
              .map(
                (
                  entry,
                  index,
                ) => (
                  <View
                    key={
                      entry.proofId
                    }
                    style={[
                      styles.activityRow,
                      index ===
                        Math.min(
                          aliceWork.length,
                          5,
                        ) -
                          1 &&
                        styles.activityRowLast,
                    ]}
                  >
                    <View
                      style={
                        styles.activityIcon
                      }
                    >
                      <Text
                        style={
                          styles.activityIconText
                        }
                      >
                        ✓
                      </Text>
                    </View>

                    <View
                      style={{
                        flex: 1,
                      }}
                    >
                      <Text
                        style={
                          styles.activityTitle
                        }
                      >
                        {formatTask(
                          entry.task,
                        )}
                      </Text>

                      <Text
                        style={
                          styles.activityMeta
                        }
                      >
                        {
                          entry.proofId
                        }{" "}
                        · Block{" "}
                        {
                          entry.block
                        }
                      </Text>
                    </View>

                    <View
                      style={
                        styles.rewardWrap
                      }
                    >
                      <Text
                        style={
                          styles.rewardValue
                        }
                      >
                        +
                        {
                          entry.reward
                        }
                      </Text>

                      <Text
                        style={
                          styles.rewardLabel
                        }
                      >
                        PRISM
                      </Text>
                    </View>
                  </View>
                ),
              )
          )}
        </View>

        {latestWork && (
          <View
            style={
              styles.latestCard
            }
          >
            <Text
              style={
                styles.sectionEyebrow
              }
            >
              LATEST PROOF
            </Text>

            <View
              style={
                styles.latestHeader
              }
            >
              <View>
                <Text
                  style={
                    styles.latestTask
                  }
                >
                  {formatTask(
                    latestWork.task,
                  )}
                </Text>

                <Text
                  style={
                    styles.latestId
                  }
                >
                  {
                    latestWork.proofId
                  }
                </Text>
              </View>

              <View
                style={
                  styles.latestVerified
                }
              >
                <Text
                  style={
                    styles.latestVerifiedText
                  }
                >
                  VERIFIED
                </Text>
              </View>
            </View>

            <View
              style={
                styles.latestMetrics
              }
            >
              <MetricCard
                value={
                  latestWork.block
                }
                label="BLOCK"
              />

              <MetricCard
                value={
                  latestWork.result
                }
                label="RESULT"
                tone="blue"
              />

              <MetricCard
                value={`+${latestWork.reward}`}
                label="PRISM"
                tone="green"
              />
            </View>
          </View>
        )}

        <View
          style={
            styles.sectionHeader
          }
        >
          <View>
            <Text
              style={
                styles.sectionEyebrow
              }
            >
              CONTRIBUTION
            </Text>

            <Text
              style={
                styles.sectionTitle
              }
            >
              Your Prism profile
            </Text>
          </View>
        </View>

        <View
          style={
            styles.contributionCard
          }
        >
          <View
            style={
              styles.contributionRow
            }
          >
            <View
              style={[
                styles.contributionIcon,
                styles.contributionIconGold,
              ]}
            >
              <Text
                style={
                  styles.contributionIconText
                }
              >
                S
              </Text>
            </View>

            <View
              style={{ flex: 1 }}
            >
              <Text
                style={
                  styles.contributionTitle
                }
              >
                Proof of Stake
              </Text>

              <Text
                style={
                  styles.contributionSubtitle
                }
              >
                Capital-secured
                participation
              </Text>
            </View>

            <Text
              style={[
                styles.contributionValue,
                styles.gold,
              ]}
            >
              {formatNumber(
                aliceValidator?.stake ??
                  0,
              )}
            </Text>
          </View>

          <View
            style={
              styles.contributionDivider
            }
          />

          <View
            style={
              styles.contributionRow
            }
          >
            <View
              style={[
                styles.contributionIcon,
                styles.contributionIconBlue,
              ]}
            >
              <Text
                style={
                  styles.contributionIconText
                }
              >
                W
              </Text>
            </View>

            <View
              style={{ flex: 1 }}
            >
              <Text
                style={
                  styles.contributionTitle
                }
              >
                Useful Work
              </Text>

              <Text
                style={
                  styles.contributionSubtitle
                }
              >
                Verified local
                computation
              </Text>
            </View>

            <Text
              style={[
                styles.contributionValue,
                styles.blue,
              ]}
            >
              {aliceParticipant
                ?.usefulWorkUnits ??
                0}
            </Text>
          </View>

          <View
            style={
              styles.contributionDivider
            }
          />

          <View
            style={
              styles.contributionRow
            }
          >
            <View
              style={[
                styles.contributionIcon,
                styles.contributionIconGreen,
              ]}
            >
              <Text
                style={
                  styles.contributionIconText
                }
              >
                H
              </Text>
            </View>

            <View
              style={{ flex: 1 }}
            >
              <Text
                style={
                  styles.contributionTitle
                }
              >
                Humanity
              </Text>

              <Text
                style={
                  styles.contributionSubtitle
                }
              >
                World ID-backed
                verification
              </Text>
            </View>

            <Text
              style={[
                styles.contributionValue,
                aliceHumanity
                  ? styles.green
                  : styles.muted,
              ]}
            >
              {aliceHumanity
                ? "YES"
                : "NO"}
            </Text>
          </View>

          <View
            style={
              styles.contributionDivider
            }
          />

          <View
            style={
              styles.contributionRow
            }
          >
            <View
              style={[
                styles.contributionIcon,
                styles.contributionIconPurple,
              ]}
            >
              <Text
                style={
                  styles.contributionIconText
                }
              >
                P
              </Text>
            </View>

            <View
              style={{ flex: 1 }}
            >
              <Text
                style={
                  styles.contributionTitle
                }
              >
                Participation
              </Text>

              <Text
                style={
                  styles.contributionSubtitle
                }
              >
                Composite PoUP
                reputation
              </Text>
            </View>

            <Text
              style={[
                styles.contributionValue,
                styles.purple,
              ]}
            >
              {aliceParticipant
                ?.participationScore ??
                0}
            </Text>
          </View>
        </View>

        <View
          style={
            styles.tokenCard
          }
        >
          <Text
            style={
              styles.sectionEyebrow
            }
          >
            TOKENOMICS
          </Text>

          <Text
            style={
              styles.tokenTitle
            }
          >
            Protocol reserve
          </Text>

          <Text
            style={
              styles.tokenDescription
            }
          >
            Remaining protocol-controlled
            allocations across ecosystem,
            treasury, team and liquidity.
          </Text>

          <View
            style={
              styles.reserveValueCard
            }
          >
            <Text
              style={
                styles.reserveValue
              }
            >
              {(
                reservedRemaining /
                1_000_000
              ).toFixed(0)}
              M
            </Text>

            <Text
              style={
                styles.reserveLabel
              }
            >
              PRISM RESERVED
            </Text>
          </View>

          <View
            style={
              styles.reserveGrid
            }
          >
            <View
              style={
                styles.reserveMini
              }
            >
              <Text
                style={
                  styles.reserveMiniValue
                }
              >
                {reserved
                  ? `${(
                      reserved
                        .remaining
                        .ecosystemRemaining /
                      1_000_000
                    ).toFixed(0)}M`
                  : "0M"}
              </Text>

              <Text
                style={
                  styles.reserveMiniLabel
                }
              >
                ECOSYSTEM
              </Text>
            </View>

            <View
              style={
                styles.reserveMini
              }
            >
              <Text
                style={
                  styles.reserveMiniValue
                }
              >
                {reserved
                  ? `${(
                      reserved
                        .remaining
                        .treasuryRemaining /
                      1_000_000
                    ).toFixed(0)}M`
                  : "0M"}
              </Text>

              <Text
                style={
                  styles.reserveMiniLabel
                }
              >
                TREASURY
              </Text>
            </View>

            <View
              style={
                styles.reserveMini
              }
            >
              <Text
                style={
                  styles.reserveMiniValue
                }
              >
                {reserved
                  ? `${(
                      reserved
                        .remaining
                        .teamRemaining /
                      1_000_000
                    ).toFixed(0)}M`
                  : "0M"}
              </Text>

              <Text
                style={
                  styles.reserveMiniLabel
                }
              >
                TEAM
              </Text>
            </View>

            <View
              style={
                styles.reserveMini
              }
            >
              <Text
                style={
                  styles.reserveMiniValue
                }
              >
                {reserved
                  ? `${(
                      reserved
                        .remaining
                        .liquidityRemaining /
                      1_000_000
                    ).toFixed(0)}M`
                  : "0M"}
              </Text>

              <Text
                style={
                  styles.reserveMiniLabel
                }
              >
                LIQUIDITY
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.footer}>
          Prism · Capital + Work +
          Humanity
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles =
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: "#05070c",
    },

    container: {
      flex: 1,
      backgroundColor: "#05070c",
    },

    content: {
      paddingHorizontal: 18,
      paddingTop: 16,
      paddingBottom: 110,
      gap: 16,
    },

    header: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent:
        "space-between",
      gap: 12,
    },

    headerEyebrow: {
      color: "#58677f",
      fontSize: 9,
      fontWeight: "900",
      letterSpacing: 1.8,
    },

    headerTitle: {
      color: "#ffffff",
      fontSize: 36,
      fontWeight: "900",
      letterSpacing: -1.1,
      marginTop: 2,
    },

    headerSubtitle: {
      color: "#6c7a90",
      fontSize: 12,
      marginTop: 3,
    },

    statusBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: "#0a2118",
      borderWidth: 1,
      borderColor: "#16452f",
      borderRadius: 999,
      paddingHorizontal: 11,
      paddingVertical: 7,
    },

    statusBadgeDemo: {
      backgroundColor: "#2b2310",
      borderColor: "#594717",
    },

    statusBadgeConnecting: {
      backgroundColor: "#101827",
      borderColor: "#273d60",
    },

    statusDot: {
      width: 7,
      height: 7,
      borderRadius: 999,
      backgroundColor: "#45e391",
    },

    statusDotDemo: {
      backgroundColor: "#e1bc68",
    },

    statusDotConnecting: {
      backgroundColor: "#68a7ff",
    },

    statusText: {
      color: "#72e8a8",
      fontSize: 8,
      fontWeight: "900",
      letterSpacing: 1,
    },

    statusTextDemo: {
      color: "#e1bc68",
    },

    statusTextConnecting: {
      color: "#68a7ff",
    },

    demoCard: {
      padding: 15,
      borderRadius: 15,
      backgroundColor: "#211c0e",
      borderWidth: 1,
      borderColor: "#4d4020",
    },

    demoTitle: {
      color: "#e1bc68",
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 1.3,
    },

    demoText: {
      color: "#9a8b65",
      fontSize: 11,
      lineHeight: 17,
      marginTop: 6,
    },

    demoError: {
      color: "#756b52",
      fontSize: 9,
      marginTop: 7,
      fontFamily: "monospace",
    },

    profileHero: {
      padding: 18,
      borderRadius: 20,
      backgroundColor: "#0b101a",
      borderWidth: 1,
      borderColor: "#1b2639",
    },

    profileTop: {
      flexDirection: "row",
      justifyContent:
        "space-between",
      alignItems: "flex-start",
      gap: 12,
    },

    profileEyebrow: {
      color: "#58677f",
      fontSize: 8,
      fontWeight: "900",
      letterSpacing: 1.4,
    },

    profileName: {
      color: "#ffffff",
      fontSize: 27,
      fontWeight: "900",
      marginTop: 5,
    },

    profileAddress: {
      color: "#66758e",
      fontSize: 10,
      fontFamily: "monospace",
      marginTop: 4,
    },

    identityBadge: {
      alignItems: "center",
      justifyContent: "center",
      minWidth: 76,
      minHeight: 62,
      paddingHorizontal: 10,
      borderRadius: 15,
      backgroundColor: "#0a2118",
      borderWidth: 1,
      borderColor: "#16452f",
    },

    identityBadgeOff: {
      backgroundColor: "#241719",
      borderColor: "#553039",
    },

    identityIcon: {
      color: "#62df99",
      fontSize: 17,
      fontWeight: "900",
    },

    identityIconOff: {
      color: "#ff7782",
    },

    identityText: {
      color: "#72e8a8",
      fontSize: 7,
      fontWeight: "900",
      letterSpacing: 0.8,
      marginTop: 3,
    },

    identityTextOff: {
      color: "#ff8b8b",
    },

    earningsCard: {
      marginTop: 17,
      padding: 17,
      borderRadius: 15,
      backgroundColor: "#08160f",
      borderWidth: 1,
      borderColor: "#15462f",
    },

    earningsLabel: {
      color: "#5e9476",
      fontSize: 8,
      fontWeight: "900",
      letterSpacing: 1.3,
    },

    earningsRow: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: 7,
      marginTop: 4,
    },

    earningsValue: {
      color: "#69e7a1",
      fontSize: 38,
      fontWeight: "900",
      letterSpacing: -1,
    },

    earningsUnit: {
      color: "#65ad84",
      fontSize: 12,
      fontWeight: "900",
    },

    earningsMeta: {
      color: "#688374",
      fontSize: 10,
      marginTop: 4,
    },

    profileMetrics: {
      flexDirection: "row",
      gap: 8,
      marginTop: 12,
    },

    metricCard: {
      flex: 1,
      minHeight: 76,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 5,
      borderRadius: 13,
      backgroundColor: "#0e1522",
      borderWidth: 1,
      borderColor: "#17243b",
    },

    metricValue: {
      color: "#ffffff",
      fontSize: 18,
      fontWeight: "900",
    },

    metricLabel: {
      color: "#56647c",
      fontSize: 7,
      fontWeight: "900",
      letterSpacing: 0.7,
      marginTop: 5,
      textAlign: "center",
    },

    blue: {
      color: "#68a7ff",
    },

    green: {
      color: "#66e39d",
    },

    gold: {
      color: "#e1bc68",
    },

    purple: {
      color: "#aaaefe",
    },

    muted: {
      color: "#718096",
    },

    sectionHeader: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent:
        "space-between",
      gap: 10,
      marginTop: 2,
    },

    sectionEyebrow: {
      color: "#58677f",
      fontSize: 8,
      fontWeight: "900",
      letterSpacing: 1.4,
    },

    sectionTitle: {
      color: "#edf3ff",
      fontSize: 20,
      fontWeight: "900",
      marginTop: 4,
    },

    healthBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: "#0a2118",
      borderWidth: 1,
      borderColor: "#16452f",
    },

    healthBadgeBad: {
      backgroundColor: "#2b1719",
      borderColor: "#633038",
    },

    healthDot: {
      width: 6,
      height: 6,
      borderRadius: 999,
      backgroundColor: "#45e391",
    },

    healthDotBad: {
      backgroundColor: "#ff737e",
    },

    healthText: {
      color: "#72e8a8",
      fontSize: 7,
      fontWeight: "900",
      letterSpacing: 0.8,
    },

    healthTextBad: {
      color: "#ff8b8b",
    },

    networkCard: {
      padding: 18,
      borderRadius: 20,
      backgroundColor: "#0b101a",
      borderWidth: 1,
      borderColor: "#1b2639",
    },

    networkTop: {
      flexDirection: "row",
      justifyContent:
        "space-between",
      alignItems: "flex-start",
      gap: 12,
    },

    networkEyebrow: {
      color: "#596a84",
      fontSize: 8,
      fontWeight: "900",
      letterSpacing: 1.3,
    },

    networkHeight: {
      color: "#ffffff",
      fontSize: 40,
      fontWeight: "900",
      letterSpacing: -1,
      marginTop: 4,
    },

    protocolBadge: {
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 9,
      backgroundColor: "#10192a",
      borderWidth: 1,
      borderColor: "#1c2c48",
    },

    protocolText: {
      color: "#86b7ff",
      fontSize: 9,
      fontWeight: "900",
    },

    networkMetrics: {
      flexDirection: "row",
      gap: 8,
      marginTop: 15,
    },

    networkMeta: {
      marginTop: 15,
      padding: 13,
      borderRadius: 13,
      backgroundColor: "#080d16",
      borderWidth: 1,
      borderColor: "#172239",
    },

    networkMetaRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      gap: 12,
      paddingVertical: 7,
    },

    networkMetaLabel: {
      color: "#52617a",
      fontSize: 8,
      fontWeight: "900",
      letterSpacing: 0.8,
    },

    networkMetaValue: {
      color: "#dce6f6",
      fontSize: 10,
      fontWeight: "800",
    },

    hashStrip: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      gap: 10,
      marginTop: 14,
    },

    hashLabel: {
      color: "#52617a",
      fontSize: 7,
      fontWeight: "900",
      letterSpacing: 1,
    },

    hashValue: {
      flex: 1,
      textAlign: "right",
      color: "#6e7f99",
      fontSize: 9,
      fontFamily: "monospace",
    },

    activityCount: {
      color: "#68a7ff",
      fontSize: 18,
      fontWeight: "900",
    },

    activityCard: {
      paddingHorizontal: 15,
      borderRadius: 18,
      backgroundColor: "#0a0f18",
      borderWidth: 1,
      borderColor: "#182338",
    },

    activityRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 15,
      borderBottomWidth: 1,
      borderBottomColor: "#141d2e",
    },

    activityRowLast: {
      borderBottomWidth: 0,
    },

    activityIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#0d251c",
      borderWidth: 1,
      borderColor: "#1f5139",
    },

    activityIconText: {
      color: "#66e39d",
      fontSize: 16,
      fontWeight: "900",
    },

    activityTitle: {
      color: "#e8efff",
      fontSize: 11,
      fontWeight: "900",
    },

    activityMeta: {
      color: "#586880",
      fontSize: 9,
      marginTop: 4,
    },

    rewardWrap: {
      alignItems: "flex-end",
    },

    rewardValue: {
      color: "#68e5a0",
      fontSize: 15,
      fontWeight: "900",
    },

    rewardLabel: {
      color: "#526079",
      fontSize: 7,
      fontWeight: "900",
      marginTop: 2,
    },

    emptyText: {
      color: "#5b6b84",
      fontSize: 11,
      paddingVertical: 18,
    },

    latestCard: {
      padding: 18,
      borderRadius: 18,
      backgroundColor: "#0b101a",
      borderWidth: 1,
      borderColor: "#1b2639",
    },

    latestHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      gap: 12,
      marginTop: 8,
    },

    latestTask: {
      color: "#ffffff",
      fontSize: 17,
      fontWeight: "900",
    },

    latestId: {
      color: "#5d6c84",
      fontSize: 9,
      fontFamily: "monospace",
      marginTop: 4,
    },

    latestVerified: {
      paddingHorizontal: 9,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: "#0a2118",
      borderWidth: 1,
      borderColor: "#16452f",
    },

    latestVerifiedText: {
      color: "#72e8a8",
      fontSize: 7,
      fontWeight: "900",
      letterSpacing: 0.7,
    },

    latestMetrics: {
      flexDirection: "row",
      gap: 8,
      marginTop: 14,
    },

    contributionCard: {
      paddingHorizontal: 15,
      borderRadius: 18,
      backgroundColor: "#0a0f18",
      borderWidth: 1,
      borderColor: "#182338",
    },

    contributionRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 15,
    },

    contributionDivider: {
      height: 1,
      backgroundColor: "#141d2e",
    },

    contributionIcon: {
      width: 36,
      height: 36,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
    },

    contributionIconGold: {
      backgroundColor: "#211c0e",
      borderColor: "#4d4020",
    },

    contributionIconBlue: {
      backgroundColor: "#10192a",
      borderColor: "#21375b",
    },

    contributionIconGreen: {
      backgroundColor: "#0a2118",
      borderColor: "#16452f",
    },

    contributionIconPurple: {
      backgroundColor: "#17162a",
      borderColor: "#39365d",
    },

    contributionIconText: {
      color: "#ffffff",
      fontSize: 12,
      fontWeight: "900",
    },

    contributionTitle: {
      color: "#e7efff",
      fontSize: 12,
      fontWeight: "900",
    },

    contributionSubtitle: {
      color: "#586880",
      fontSize: 9,
      marginTop: 3,
    },

    contributionValue: {
      fontSize: 15,
      fontWeight: "900",
    },

    tokenCard: {
      padding: 18,
      borderRadius: 20,
      backgroundColor: "#0b101a",
      borderWidth: 1,
      borderColor: "#1b2639",
    },

    tokenTitle: {
      color: "#ffffff",
      fontSize: 20,
      fontWeight: "900",
      marginTop: 5,
    },

    tokenDescription: {
      color: "#75849b",
      fontSize: 11,
      lineHeight: 17,
      marginTop: 7,
    },

    reserveValueCard: {
      marginTop: 16,
      padding: 16,
      borderRadius: 14,
      backgroundColor: "#0f1828",
      borderWidth: 1,
      borderColor: "#1c2d49",
    },

    reserveValue: {
      color: "#68a7ff",
      fontSize: 28,
      fontWeight: "900",
    },

    reserveLabel: {
      color: "#596981",
      fontSize: 8,
      fontWeight: "900",
      letterSpacing: 1,
      marginTop: 3,
    },

    reserveGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 10,
    },

    reserveMini: {
      width: "48.5%",
      padding: 12,
      borderRadius: 12,
      backgroundColor: "#0d1421",
    },

    reserveMiniValue: {
      color: "#e6eeff",
      fontSize: 15,
      fontWeight: "900",
    },

    reserveMiniLabel: {
      color: "#586880",
      fontSize: 7,
      fontWeight: "900",
      letterSpacing: 0.7,
      marginTop: 5,
    },

    footer: {
      color: "#3f4d63",
      textAlign: "center",
      fontSize: 10,
      marginTop: 5,
    },
  });