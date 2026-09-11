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

import { loadDashboard } from "../api/client";
import { DEMO_DASHBOARD } from "../api/demo";

type Dashboard =
  Awaited<ReturnType<typeof loadDashboard>>;

type ConnectionMode =
  | "connecting"
  | "live"
  | "demo";

type ActivityItem =
  | {
      kind: "work";
      block: number;
      id: string;
      title: string;
      subtitle: string;
      reward: number;
      worker: string;
    }
  | {
      kind: "humanity";
      block: number;
      id: string;
      title: string;
      subtitle: string;
      name: string;
    };

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

function StatusPill({
  mode,
}: {
  mode: ConnectionMode;
}) {
  const label =
    mode === "live"
      ? "LIVE"
      : mode === "demo"
        ? "DEMO"
        : "SYNCING";

  return (
    <View
      style={[
        styles.statusPill,
        mode === "demo" &&
          styles.statusPillDemo,
        mode === "connecting" &&
          styles.statusPillSyncing,
      ]}
    >
      <View
        style={[
          styles.statusDot,
          mode === "demo" &&
            styles.statusDotDemo,
          mode === "connecting" &&
            styles.statusDotSyncing,
        ]}
      />

      <Text
        style={[
          styles.statusPillText,
          mode === "demo" &&
            styles.statusPillTextDemo,
          mode === "connecting" &&
            styles.statusPillTextSyncing,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function StatCard({
  value,
  label,
  accent = "default",
}: {
  value: string | number;
  label: string;
  accent?:
    | "default"
    | "blue"
    | "green"
    | "gold";
}) {
  return (
    <View style={styles.statCard}>
      <Text
        style={[
          styles.statValue,
          accent === "blue" &&
            styles.blue,
          accent === "green" &&
            styles.green,
          accent === "gold" &&
            styles.gold,
        ]}
      >
        {value}
      </Text>

      <Text style={styles.statLabel}>
        {label}
      </Text>
    </View>
  );
}

export default function ExploreScreen() {
  const [dashboard, setDashboard] =
    useState<Dashboard | null>(null);

  const [mode, setMode] =
    useState<ConnectionMode>(
      "connecting",
    );

  const [refreshing, setRefreshing] =
    useState(false);

  const load =
    useCallback(async () => {
      setRefreshing(true);
      setMode("connecting");

      try {
        const data =
          await loadDashboard();

        setDashboard(data);
        setMode("live");
      } catch (error) {
        console.warn(
          "[Prism Explore] live dashboard unavailable",
          error,
        );

        setDashboard(
          DEMO_DASHBOARD as Dashboard,
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

  const status =
    dashboard?.status ?? null;

  const validators =
    dashboard?.validators ?? [];

  const participants =
    dashboard?.participants ?? [];

  const work =
    dashboard?.work ?? [];

  const humanity =
    dashboard?.humanity ?? [];

  const reserved =
    dashboard?.reserved ?? null;

  const verifiedWork =
    work.filter(
      (entry) => entry.verified,
    );

  const totalWorkRewards =
    verifiedWork.reduce(
      (sum, entry) =>
        sum + entry.reward,
      0,
    );

  const totalUsefulUnits =
    participants.reduce(
      (sum, entry) =>
        sum +
        entry.usefulWorkUnits,
      0,
    );

  const activity =
    useMemo<ActivityItem[]>(() => {
      const workActivity:
        ActivityItem[] =
        work
          .filter(
            (entry) =>
              entry.verified,
          )
          .map((entry) => ({
            kind: "work",
            block: entry.block,
            id: entry.proofId,
            title: "PoUW VERIFIED",
            subtitle:
              formatTask(entry.task),
            reward: entry.reward,
            worker: entry.worker,
          }));

      const humanityActivity:
        ActivityItem[] =
        humanity.map(
          (entry) => ({
            kind: "humanity",
            block: entry.block,
            id: `${entry.address}-${entry.block}`,
            title:
              "HUMANITY VERIFIED",
            subtitle:
              entry.provider,
            name: entry.name,
          }),
        );

      return [
        ...workActivity,
        ...humanityActivity,
      ]
        .sort(
          (a, b) =>
            b.block - a.block,
        )
        .slice(0, 8);
    }, [humanity, work]);

  const sortedValidators =
    useMemo(
      () =>
        [...validators].sort(
          (a, b) =>
            b.stake - a.stake,
        ),
      [validators],
    );

  const sortedParticipants =
    useMemo(
      () =>
        [...participants].sort(
          (a, b) =>
            b.participationScore -
            a.participationScore,
        ),
      [participants],
    );

  return (
    <SafeAreaView style={styles.safe}>
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
          <View>
            <Text
              style={
                styles.headerEyebrow
              }
            >
              PRISM PROTOCOL
            </Text>

            <Text
              style={styles.headerTitle}
            >
              Explore
            </Text>

            <Text
              style={
                styles.headerSubtitle
              }
            >
              Network activity and
              protocol state
            </Text>
          </View>

          <StatusPill mode={mode} />
        </View>

        <View style={styles.heroCard}>
          <View
            style={
              styles.heroTopRow
            }
          >
            <View style={{ flex: 1 }}>
              <Text
                style={
                  styles.heroEyebrow
                }
              >
                ACTIVE NETWORK
              </Text>

              <Text
                style={
                  styles.heroTitle
                }
              >
                {status?.network ??
                  "Prism"}
              </Text>
            </View>

            <View
              style={
                styles.protocolBadge
              }
            >
              <Text
                style={
                  styles.protocolBadgeText
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
              styles.heightBlock
            }
          >
            <Text
              style={
                styles.heightLabel
              }
            >
              CURRENT HEIGHT
            </Text>

            <Text
              style={
                styles.heightValue
              }
            >
              {status?.height ?? 0}
            </Text>

            <Text
              style={
                styles.heightMeta
              }
            >
              {status?.blocks ?? 0}{" "}
              blocks ·{" "}
              {status?.version ??
                "offline"}
            </Text>
          </View>

          <View
            style={styles.heroStats}
          >
            <StatCard
              value={
                status?.validators ??
                0
              }
              label="VALIDATORS"
              accent="gold"
            />

            <StatCard
              value={
                verifiedWork.length
              }
              label="PoUW PROOFS"
              accent="blue"
            />

            <StatCard
              value={humanity.length}
              label="HUMANS"
              accent="green"
            />
          </View>

          <View
            style={
              styles.hashStrip
            }
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
              NETWORK FEED
            </Text>

            <Text
              style={
                styles.sectionTitle
              }
            >
              Latest activity
            </Text>
          </View>

          <View
            style={
              styles.countBadge
            }
          >
            <Text
              style={
                styles.countBadgeText
              }
            >
              {activity.length}
            </Text>
          </View>
        </View>

        <View
          style={
            styles.activityCard
          }
        >
          {activity.length === 0 ? (
            <Text
              style={styles.emptyText}
            >
              No recent network
              activity.
            </Text>
          ) : (
            activity.map(
              (
                item,
                index,
              ) => (
                <View
                  key={`${item.kind}-${item.id}`}
                  style={[
                    styles.activityRow,
                    index ===
                      activity.length -
                        1 &&
                      styles.activityRowLast,
                  ]}
                >
                  <View
                    style={[
                      styles.activityIcon,
                      item.kind ===
                        "humanity" &&
                        styles.activityIconHumanity,
                    ]}
                  >
                    <Text
                      style={[
                        styles.activityIconText,
                        item.kind ===
                          "humanity" &&
                          styles.activityIconTextHumanity,
                      ]}
                    >
                      {item.kind ===
                      "work"
                        ? "✓"
                        : "H"}
                    </Text>
                  </View>

                  <View
                    style={{ flex: 1 }}
                  >
                    <Text
                      style={
                        styles.activityTitle
                      }
                    >
                      {item.title}
                    </Text>

                    <Text
                      style={
                        styles.activitySubtitle
                      }
                    >
                      {item.kind ===
                      "work"
                        ? `${item.worker} · ${item.subtitle}`
                        : `${item.name} · ${item.subtitle}`}
                    </Text>

                    <Text
                      style={
                        styles.activityBlock
                      }
                    >
                      Block{" "}
                      {item.block}
                    </Text>
                  </View>

                  {item.kind ===
                    "work" && (
                    <View
                      style={
                        styles.activityReward
                      }
                    >
                      <Text
                        style={
                          styles.activityRewardValue
                        }
                      >
                        +
                        {
                          item.reward
                        }
                      </Text>

                      <Text
                        style={
                          styles.activityRewardLabel
                        }
                      >
                        PRISM
                      </Text>
                    </View>
                  )}
                </View>
              ),
            )
          )}
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
              PROOF OF STAKE
            </Text>

            <Text
              style={
                styles.sectionTitle
              }
            >
              Validators
            </Text>
          </View>

          <Text
            style={
              styles.sectionMetric
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
          style={styles.listCard}
        >
          {sortedValidators.map(
            (
              validator,
              index,
            ) => (
              <View
                key={
                  validator.address
                }
                style={[
                  styles.validatorRow,
                  index ===
                    sortedValidators.length -
                      1 &&
                    styles.rowLast,
                ]}
              >
                <View
                  style={
                    styles.rankBadge
                  }
                >
                  <Text
                    style={
                      styles.rankText
                    }
                  >
                    {index + 1}
                  </Text>
                </View>

                <View
                  style={{ flex: 1 }}
                >
                  <Text
                    style={
                      styles.validatorName
                    }
                  >
                    {
                      validator.name
                    }
                  </Text>

                  <Text
                    style={
                      styles.validatorAddress
                    }
                  >
                    {short(
                      validator.address,
                    )}
                  </Text>
                </View>

                <View
                  style={
                    styles.stakeWrap
                  }
                >
                  <Text
                    style={
                      styles.stakeValue
                    }
                  >
                    {formatNumber(
                      validator.stake,
                    )}
                  </Text>

                  <Text
                    style={
                      styles.stakeLabel
                    }
                  >
                    STAKE
                  </Text>
                </View>
              </View>
            ),
          )}
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
              WORLD ID
            </Text>

            <Text
              style={
                styles.sectionTitle
              }
            >
              Humanity
            </Text>
          </View>

          <Text
            style={[
              styles.sectionMetric,
              styles.green,
            ]}
          >
            {humanity.length} VERIFIED
          </Text>
        </View>

        <View
          style={styles.listCard}
        >
          {humanity.map(
            (
              identity,
              index,
            ) => (
              <View
                key={`${identity.address}-${identity.block}`}
                style={[
                  styles.humanityRow,
                  index ===
                    humanity.length -
                      1 &&
                    styles.rowLast,
                ]}
              >
                <View
                  style={
                    styles.verifiedIcon
                  }
                >
                  <Text
                    style={
                      styles.verifiedIconText
                    }
                  >
                    ✓
                  </Text>
                </View>

                <View
                  style={{ flex: 1 }}
                >
                  <Text
                    style={
                      styles.validatorName
                    }
                  >
                    {identity.name}
                  </Text>

                  <Text
                    style={
                      styles.validatorAddress
                    }
                  >
                    {
                      identity.provider
                    }{" "}
                    ·{" "}
                    {identity.action}
                  </Text>
                </View>

                <View
                  style={
                    styles.blockMini
                  }
                >
                  <Text
                    style={
                      styles.blockMiniValue
                    }
                  >
                    {
                      identity.block
                    }
                  </Text>

                  <Text
                    style={
                      styles.blockMiniLabel
                    }
                  >
                    BLOCK
                  </Text>
                </View>
              </View>
            ),
          )}
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
              PROOF OF USEFUL
              PARTICIPATION
            </Text>

            <Text
              style={
                styles.sectionTitle
              }
            >
              Leaderboard
            </Text>
          </View>

          <Text
            style={
              styles.sectionMetric
            }
          >
            {totalUsefulUnits} UNITS
          </Text>
        </View>

        <View
          style={styles.listCard}
        >
          {sortedParticipants.map(
            (
              participant,
              index,
            ) => (
              <View
                key={
                  participant.address
                }
                style={[
                  styles.participantRow,
                  index ===
                    sortedParticipants.length -
                      1 &&
                    styles.rowLast,
                ]}
              >
                <View
                  style={[
                    styles.rankBadge,
                    index === 0 &&
                      styles.rankBadgeFirst,
                  ]}
                >
                  <Text
                    style={[
                      styles.rankText,
                      index === 0 &&
                        styles.rankTextFirst,
                    ]}
                  >
                    {index + 1}
                  </Text>
                </View>

                <View
                  style={{ flex: 1 }}
                >
                  <View
                    style={
                      styles.participantNameRow
                    }
                  >
                    <Text
                      style={
                        styles.validatorName
                      }
                    >
                      {
                        participant.name
                      }
                    </Text>

                    {participant.humanityVerified && (
                      <Text
                        style={
                          styles.humanBadge
                        }
                      >
                        HUMAN
                      </Text>
                    )}
                  </View>

                  <Text
                    style={
                      styles.validatorAddress
                    }
                  >
                    {
                      participant.blocksProposed
                    }{" "}
                    blocks ·{" "}
                    {
                      participant.usefulWorkUnits
                    }{" "}
                    work units
                  </Text>
                </View>

                <View
                  style={
                    styles.scoreWrap
                  }
                >
                  <Text
                    style={
                      styles.scoreValue
                    }
                  >
                    {
                      participant.participationScore
                    }
                  </Text>

                  <Text
                    style={
                      styles.scoreLabel
                    }
                  >
                    SCORE
                  </Text>
                </View>
              </View>
            ),
          )}
        </View>

        <View
          style={
            styles.metricsGrid
          }
        >
          <StatCard
            value={`+${totalWorkRewards}`}
            label="PoUW REWARDS"
            accent="green"
          />

          <StatCard
            value={
              status?.totalSupply ??
              0
            }
            label="TOTAL SUPPLY"
            accent="blue"
          />
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
            Reserved supply
          </Text>

          <Text
            style={
              styles.tokenDescription
            }
          >
            Protocol allocations
            reserved for ecosystem,
            treasury, team and
            liquidity.
          </Text>

          <View
            style={
              styles.tokenMainValue
            }
          >
            <Text
              style={
                styles.tokenMainNumber
              }
            >
              {reserved
                ? (
                    reserved
                      .remaining
                      .totalRemaining /
                    1_000_000
                  ).toFixed(0)
                : "0"}
              M
            </Text>

            <Text
              style={
                styles.tokenMainLabel
              }
            >
              PRISM REMAINING
            </Text>
          </View>

          <View
            style={
              styles.allocationGrid
            }
          >
            <View
              style={
                styles.allocationCard
              }
            >
              <Text
                style={
                  styles.allocationValue
                }
              >
                {reserved
                  ? formatNumber(
                      reserved
                        .remaining
                        .ecosystemRemaining,
                    )
                  : "0"}
              </Text>

              <Text
                style={
                  styles.allocationLabel
                }
              >
                ECOSYSTEM
              </Text>
            </View>

            <View
              style={
                styles.allocationCard
              }
            >
              <Text
                style={
                  styles.allocationValue
                }
              >
                {reserved
                  ? formatNumber(
                      reserved
                        .remaining
                        .treasuryRemaining,
                    )
                  : "0"}
              </Text>

              <Text
                style={
                  styles.allocationLabel
                }
              >
                TREASURY
              </Text>
            </View>

            <View
              style={
                styles.allocationCard
              }
            >
              <Text
                style={
                  styles.allocationValue
                }
              >
                {reserved
                  ? formatNumber(
                      reserved
                        .remaining
                        .teamRemaining,
                    )
                  : "0"}
              </Text>

              <Text
                style={
                  styles.allocationLabel
                }
              >
                TEAM
              </Text>
            </View>

            <View
              style={
                styles.allocationCard
              }
            >
              <Text
                style={
                  styles.allocationValue
                }
              >
                {reserved
                  ? formatNumber(
                      reserved
                        .remaining
                        .liquidityRemaining,
                    )
                  : "0"}
              </Text>

              <Text
                style={
                  styles.allocationLabel
                }
              >
                LIQUIDITY
              </Text>
            </View>
          </View>
        </View>

        <View
          style={
            styles.architectureCard
          }
        >
          <Text
            style={
              styles.architectureEyebrow
            }
          >
            PRISM ARCHITECTURE
          </Text>

          <Text
            style={
              styles.architectureTitle
            }
          >
            Capital + Work +
            Humanity
          </Text>

          <Text
            style={
              styles.architectureText
            }
          >
            Prism combines capital
            security, useful
            computation and verified
            participation instead of
            relying on a single source
            of network influence.
          </Text>

          <View
            style={
              styles.architectureFlow
            }
          >
            <View
              style={
                styles.architectureNode
              }
            >
              <Text
                style={
                  styles.architectureNodeTitle
                }
              >
                PoS
              </Text>

              <Text
                style={
                  styles.architectureNodeLabel
                }
              >
                CAPITAL
              </Text>
            </View>

            <Text
              style={
                styles.architecturePlus
              }
            >
              +
            </Text>

            <View
              style={
                styles.architectureNode
              }
            >
              <Text
                style={
                  styles.architectureNodeTitle
                }
              >
                PoUW
              </Text>

              <Text
                style={
                  styles.architectureNodeLabel
                }
              >
                WORK
              </Text>
            </View>

            <Text
              style={
                styles.architecturePlus
              }
            >
              +
            </Text>

            <View
              style={
                styles.architectureNode
              }
            >
              <Text
                style={
                  styles.architectureNodeTitle
                }
              >
                PoUP
              </Text>

              <Text
                style={
                  styles.architectureNodeLabel
                }
              >
                HUMAN
              </Text>
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

    statusPill: {
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

    statusPillDemo: {
      backgroundColor: "#2b2310",
      borderColor: "#594717",
    },

    statusPillSyncing: {
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

    statusDotSyncing: {
      backgroundColor: "#68a7ff",
    },

    statusPillText: {
      color: "#72e8a8",
      fontSize: 8,
      fontWeight: "900",
      letterSpacing: 1,
    },

    statusPillTextDemo: {
      color: "#e1bc68",
    },

    statusPillTextSyncing: {
      color: "#68a7ff",
    },

    heroCard: {
      backgroundColor: "#0b101a",
      borderWidth: 1,
      borderColor: "#1b2639",
      borderRadius: 20,
      padding: 18,
    },

    heroTopRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
    },

    heroEyebrow: {
      color: "#596a84",
      fontSize: 8,
      fontWeight: "900",
      letterSpacing: 1.4,
    },

    heroTitle: {
      color: "#69a7ff",
      fontSize: 27,
      fontWeight: "900",
      marginTop: 5,
    },

    protocolBadge: {
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 9,
      backgroundColor: "#10192a",
      borderWidth: 1,
      borderColor: "#1c2c48",
    },

    protocolBadgeText: {
      color: "#86b7ff",
      fontSize: 9,
      fontWeight: "900",
    },

    heightBlock: {
      marginTop: 18,
      padding: 16,
      borderRadius: 14,
      backgroundColor: "#080d16",
      borderWidth: 1,
      borderColor: "#172239",
    },

    heightLabel: {
      color: "#55657e",
      fontSize: 8,
      fontWeight: "900",
      letterSpacing: 1.3,
    },

    heightValue: {
      color: "#ffffff",
      fontSize: 40,
      fontWeight: "900",
      letterSpacing: -1,
      marginTop: 4,
    },

    heightMeta: {
      color: "#65758e",
      fontSize: 10,
      marginTop: 3,
    },

    heroStats: {
      flexDirection: "row",
      gap: 8,
      marginTop: 12,
    },

    statCard: {
      flex: 1,
      minHeight: 76,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#0e1522",
      borderWidth: 1,
      borderColor: "#17243b",
      borderRadius: 13,
      paddingHorizontal: 5,
    },

    statValue: {
      color: "#ffffff",
      fontSize: 18,
      fontWeight: "900",
    },

    statLabel: {
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
      color: "#e2be6e",
    },

    hashStrip: {
      flexDirection: "row",
      justifyContent:
        "space-between",
      alignItems: "center",
      gap: 10,
      marginTop: 13,
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

    sectionHeader: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent:
        "space-between",
      gap: 10,
      marginTop: 3,
    },

    sectionEyebrow: {
      color: "#58677f",
      fontSize: 8,
      fontWeight: "900",
      letterSpacing: 1.4,
    },

    sectionTitle: {
      color: "#eef3ff",
      fontSize: 20,
      fontWeight: "900",
      marginTop: 4,
    },

    sectionMetric: {
      color: "#8091aa",
      fontSize: 9,
      fontWeight: "900",
    },

    countBadge: {
      width: 36,
      height: 36,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#10192a",
      borderWidth: 1,
      borderColor: "#1d2d49",
    },

    countBadgeText: {
      color: "#68a7ff",
      fontSize: 15,
      fontWeight: "900",
    },

    activityCard: {
      backgroundColor: "#0a0f18",
      borderWidth: 1,
      borderColor: "#182338",
      borderRadius: 18,
      paddingHorizontal: 15,
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

    activityIconHumanity: {
      backgroundColor: "#101b2b",
      borderColor: "#253b5e",
    },

    activityIconText: {
      color: "#66e39d",
      fontSize: 16,
      fontWeight: "900",
    },

    activityIconTextHumanity: {
      color: "#7fb3ff",
      fontSize: 12,
    },

    activityTitle: {
      color: "#e8efff",
      fontSize: 11,
      fontWeight: "900",
      letterSpacing: 0.3,
    },

    activitySubtitle: {
      color: "#687890",
      fontSize: 10,
      marginTop: 3,
    },

    activityBlock: {
      color: "#46556e",
      fontSize: 8,
      fontWeight: "800",
      marginTop: 4,
    },

    activityReward: {
      alignItems: "flex-end",
    },

    activityRewardValue: {
      color: "#68e5a0",
      fontSize: 15,
      fontWeight: "900",
    },

    activityRewardLabel: {
      color: "#526079",
      fontSize: 7,
      fontWeight: "900",
      marginTop: 2,
    },

    listCard: {
      backgroundColor: "#0a0f18",
      borderWidth: 1,
      borderColor: "#182338",
      borderRadius: 18,
      paddingHorizontal: 15,
    },

    validatorRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 15,
      borderBottomWidth: 1,
      borderBottomColor: "#141d2e",
    },

    humanityRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 15,
      borderBottomWidth: 1,
      borderBottomColor: "#141d2e",
    },

    participantRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 15,
      borderBottomWidth: 1,
      borderBottomColor: "#141d2e",
    },

    rowLast: {
      borderBottomWidth: 0,
    },

    rankBadge: {
      width: 32,
      height: 32,
      borderRadius: 11,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#101827",
      borderWidth: 1,
      borderColor: "#1c2a42",
    },

    rankBadgeFirst: {
      backgroundColor: "#241f0f",
      borderColor: "#52451d",
    },

    rankText: {
      color: "#8292ad",
      fontSize: 11,
      fontWeight: "900",
    },

    rankTextFirst: {
      color: "#e3bf6d",
    },

    validatorName: {
      color: "#e7efff",
      fontSize: 12,
      fontWeight: "900",
    },

    validatorAddress: {
      color: "#52617a",
      fontSize: 9,
      marginTop: 4,
    },

    stakeWrap: {
      alignItems: "flex-end",
    },

    stakeValue: {
      color: "#e4be69",
      fontSize: 14,
      fontWeight: "900",
    },

    stakeLabel: {
      color: "#59677e",
      fontSize: 7,
      fontWeight: "900",
      marginTop: 3,
    },

    verifiedIcon: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#0d251c",
      borderWidth: 1,
      borderColor: "#1d5037",
    },

    verifiedIconText: {
      color: "#65e39d",
      fontSize: 15,
      fontWeight: "900",
    },

    blockMini: {
      alignItems: "flex-end",
    },

    blockMiniValue: {
      color: "#7eb2ff",
      fontSize: 13,
      fontWeight: "900",
    },

    blockMiniLabel: {
      color: "#526079",
      fontSize: 7,
      fontWeight: "900",
      marginTop: 3,
    },

    participantNameRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
    },

    humanBadge: {
      color: "#62df99",
      fontSize: 6,
      fontWeight: "900",
      letterSpacing: 0.6,
      paddingHorizontal: 5,
      paddingVertical: 3,
      backgroundColor: "#0d251c",
      borderRadius: 5,
      overflow: "hidden",
    },

    scoreWrap: {
      alignItems: "flex-end",
    },

    scoreValue: {
      color: "#aab0ff",
      fontSize: 16,
      fontWeight: "900",
    },

    scoreLabel: {
      color: "#59677e",
      fontSize: 7,
      fontWeight: "900",
      marginTop: 3,
    },

    metricsGrid: {
      flexDirection: "row",
      gap: 9,
    },

    tokenCard: {
      backgroundColor: "#0b101a",
      borderWidth: 1,
      borderColor: "#1b2639",
      borderRadius: 20,
      padding: 18,
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

    tokenMainValue: {
      marginTop: 17,
      padding: 16,
      borderRadius: 14,
      backgroundColor: "#0f1828",
      borderWidth: 1,
      borderColor: "#1c2d49",
    },

    tokenMainNumber: {
      color: "#68a7ff",
      fontSize: 28,
      fontWeight: "900",
    },

    tokenMainLabel: {
      color: "#596981",
      fontSize: 8,
      fontWeight: "900",
      letterSpacing: 1,
      marginTop: 3,
    },

    allocationGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 10,
    },

    allocationCard: {
      width: "48.5%",
      backgroundColor: "#0d1421",
      borderRadius: 12,
      padding: 12,
    },

    allocationValue: {
      color: "#e6eeff",
      fontSize: 11,
      fontWeight: "900",
    },

    allocationLabel: {
      color: "#586880",
      fontSize: 7,
      fontWeight: "900",
      letterSpacing: 0.7,
      marginTop: 5,
    },

    architectureCard: {
      backgroundColor: "#0d1321",
      borderWidth: 1,
      borderColor: "#34355c",
      borderRadius: 20,
      padding: 18,
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
      justifyContent:
        "space-between",
      gap: 7,
      marginTop: 18,
    },

    architectureNode: {
      flex: 1,
      minHeight: 68,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#14172a",
      borderWidth: 1,
      borderColor: "#30345a",
      borderRadius: 14,
    },

    architectureNodeTitle: {
      color: "#a9afff",
      fontSize: 15,
      fontWeight: "900",
    },

    architectureNodeLabel: {
      color: "#666b91",
      fontSize: 6,
      fontWeight: "900",
      letterSpacing: 0.8,
      marginTop: 4,
    },

    architecturePlus: {
      color: "#576079",
      fontSize: 14,
      fontWeight: "900",
    },

    emptyText: {
      color: "#5b6b84",
      fontSize: 11,
      paddingVertical: 18,
    },

    footer: {
      color: "#3f4d63",
      textAlign: "center",
      fontSize: 10,
      marginTop: 5,
    },
  });