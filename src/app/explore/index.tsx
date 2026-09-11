import {
  router,
  useFocusEffect,
} from "expo-router";
import {
  useCallback,
  useMemo,
  useState,
} from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { loadDashboard } from "@/api/client";
import { DEMO_DASHBOARD } from "@/api/demo";

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

function SectionHeader({
  eyebrow,
  title,
  metric,
  metricTone = "default",
}: {
  eyebrow: string;
  title: string;
  metric?: string;
  metricTone?:
    | "default"
    | "green"
    | "blue"
    | "gold";
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={{ flex: 1 }}>
        <Text style={styles.sectionEyebrow}>
          {eyebrow}
        </Text>

        <Text style={styles.sectionTitle}>
          {title}
        </Text>
      </View>

      {metric ? (
        <Text
          style={[
            styles.sectionMetric,
            metricTone === "green" &&
              styles.green,
            metricTone === "blue" &&
              styles.blue,
            metricTone === "gold" &&
              styles.gold,
          ]}
        >
          {metric}
        </Text>
      ) : null}
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
    useMemo(
      () =>
        work.filter(
          (entry) => entry.verified,
        ),
      [work],
    );

  const totalWorkRewards =
    useMemo(
      () =>
        verifiedWork.reduce(
          (sum, entry) =>
            sum + entry.reward,
          0,
        ),
      [verifiedWork],
    );

  const totalUsefulUnits =
    useMemo(
      () =>
        participants.reduce(
          (sum, entry) =>
            sum +
            entry.usefulWorkUnits,
          0,
        ),
      [participants],
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

  const openProof =
    useCallback(
      (proofId: string) => {
        router.push({
          pathname:
            "/explore/proof/[proofId]",
          params: {
            proofId,
          },
        });
      },
      [],
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
          <View style={{ flex: 1 }}>
            <Text
              style={
                styles.headerEyebrow
              }
            >
              PRISM PROTOCOL
            </Text>

            <Text
              style={
                styles.headerTitle
              }
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
          <View style={{ flex: 1 }}>
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
              (item, index) => (
                <Pressable
                  key={`${item.kind}-${item.id}`}
                  disabled={
                    item.kind !==
                    "work"
                  }
                  accessibilityRole={
                    item.kind ===
                    "work"
                      ? "button"
                      : undefined
                  }
                  accessibilityLabel={
                    item.kind ===
                    "work"
                      ? `Open proof ${item.id}`
                      : undefined
                  }
                  onPress={() => {
                    if (
                      item.kind ===
                      "work"
                    ) {
                      openProof(
                        item.id,
                      );
                    }
                  }}
                  style={({
                    pressed,
                  }) => [
                    styles.activityRow,
                    index ===
                      activity.length -
                        1 &&
                      styles.activityRowLast,
                    pressed &&
                      item.kind ===
                        "work" &&
                      styles.activityRowPressed,
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
                  "work" ? (
                    <View
                      style={
                        styles.activityRight
                      }
                    >
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

                      <Text
                        style={
                          styles.activityChevron
                        }
                      >
                        ›
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
              ),
            )
          )}
        </View>

        <SectionHeader
          eyebrow="PROOF OF STAKE"
          title="Validators"
          metric={`${formatNumber(
            status?.totalStake ?? 0,
          )} PRISM`}
          metricTone="gold"
        />

        <View style={styles.listCard}>
          {sortedValidators.length ===
          0 ? (
            <Text
              style={styles.emptyText}
            >
              No validators available.
            </Text>
          ) : (
            sortedValidators.map(
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
                    style={{
                      flex: 1,
                    }}
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
            )
          )}
        </View>

        <SectionHeader
          eyebrow="WORLD ID"
          title="Humanity"
          metric={`${humanity.length} VERIFIED`}
          metricTone="green"
        />

        <View style={styles.listCard}>
          {humanity.length === 0 ? (
            <Text
              style={styles.emptyText}
            >
              No humanity
              attestations.
            </Text>
          ) : (
            humanity.map(
              (entry, index) => (
                <View
                  key={`${entry.address}-${entry.block}`}
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
                      styles.humanityBadge
                    }
                  >
                    <Text
                      style={
                        styles.humanityBadgeText
                      }
                    >
                      H
                    </Text>
                  </View>

                  <View
                    style={{
                      flex: 1,
                    }}
                  >
                    <Text
                      style={
                        styles.humanityName
                      }
                    >
                      {entry.name}
                    </Text>

                    <Text
                      style={
                        styles.humanityProvider
                      }
                    >
                      {entry.provider} ·{" "}
                      {entry.action}
                    </Text>

                    <Text
                      style={
                        styles.humanityAddress
                      }
                    >
                      {short(
                        entry.address,
                      )}
                    </Text>
                  </View>

                  <View
                    style={
                      styles.blockBadge
                    }
                  >
                    <Text
                      style={
                        styles.blockBadgeLabel
                      }
                    >
                      BLOCK
                    </Text>

                    <Text
                      style={
                        styles.blockBadgeValue
                      }
                    >
                      {entry.block}
                    </Text>
                  </View>
                </View>
              ),
            )
          )}
        </View>

        <SectionHeader
          eyebrow="PROOF OF PARTICIPATION"
          title="PoUP leaderboard"
          metric={`${totalUsefulUnits} WORK UNITS`}
          metricTone="blue"
        />

        <View style={styles.listCard}>
          {sortedParticipants.length ===
          0 ? (
            <Text
              style={styles.emptyText}
            >
              No participants
              available.
            </Text>
          ) : (
            sortedParticipants.map(
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
                        styles.rankBadgeTop,
                    ]}
                  >
                    <Text
                      style={[
                        styles.rankText,
                        index === 0 &&
                          styles.rankTextTop,
                      ]}
                    >
                      {index + 1}
                    </Text>
                  </View>

                  <View
                    style={{
                      flex: 1,
                    }}
                  >
                    <View
                      style={
                        styles.participantNameRow
                      }
                    >
                      <Text
                        style={
                          styles.participantName
                        }
                      >
                        {
                          participant.name
                        }
                      </Text>

                      {participant.humanityVerified ? (
                        <View
                          style={
                            styles.verifiedMiniBadge
                          }
                        >
                          <Text
                            style={
                              styles.verifiedMiniText
                            }
                          >
                            HUMAN
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    <Text
                      style={
                        styles.participantMeta
                      }
                    >
                      {
                        participant.blocksProposed
                      }{" "}
                      proposed ·{" "}
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
            )
          )}
        </View>

        <SectionHeader
          eyebrow="PROOF OF USEFUL WORK"
          title="Verified work"
          metric={`+${formatNumber(
            totalWorkRewards,
          )} PRISM`}
          metricTone="green"
        />

        <View
          style={
            styles.workSummaryCard
          }
        >
          <View
            style={
              styles.workSummaryStats
            }
          >
            <StatCard
              value={
                verifiedWork.length
              }
              label="PROOFS"
              accent="blue"
            />

            <StatCard
              value={
                totalUsefulUnits
              }
              label="WORK UNITS"
              accent="gold"
            />

            <StatCard
              value={`+${totalWorkRewards}`}
              label="REWARDS"
              accent="green"
            />
          </View>

          <Text
            style={
              styles.workSummaryText
            }
          >
            Verified computation
            contributes useful work to
            the Prism network and is
            committed on-chain with a
            proof ID, worker, result,
            score, block and reward.
          </Text>
        </View>

        <SectionHeader
          eyebrow="TOKENOMICS"
          title="Protocol reserve"
          metric={
            reserved
              ? `${formatNumber(
                  reserved.remaining
                    .totalRemaining,
                )} PRISM`
              : "—"
          }
        />

        {reserved ? (
          <View
            style={
              styles.reserveCard
            }
          >
            <View
              style={
                styles.reserveHero
              }
            >
              <Text
                style={
                  styles.reserveEyebrow
                }
              >
                RESERVED SUPPLY
              </Text>

              <Text
                style={
                  styles.reserveValue
                }
              >
                {formatNumber(
                  reserved.remaining
                    .totalRemaining,
                )}
              </Text>

              <Text
                style={
                  styles.reserveUnit
                }
              >
                PRISM REMAINING
              </Text>
            </View>

            <View
              style={
                styles.reserveGrid
              }
            >
              <View
                style={
                  styles.reserveItem
                }
              >
                <Text
                  style={
                    styles.reserveItemValue
                  }
                >
                  {formatNumber(
                    reserved.remaining
                      .ecosystemRemaining,
                  )}
                </Text>

                <Text
                  style={
                    styles.reserveItemLabel
                  }
                >
                  ECOSYSTEM
                </Text>
              </View>

              <View
                style={
                  styles.reserveItem
                }
              >
                <Text
                  style={
                    styles.reserveItemValue
                  }
                >
                  {formatNumber(
                    reserved.remaining
                      .treasuryRemaining,
                  )}
                </Text>

                <Text
                  style={
                    styles.reserveItemLabel
                  }
                >
                  TREASURY
                </Text>
              </View>

              <View
                style={
                  styles.reserveItem
                }
              >
                <Text
                  style={
                    styles.reserveItemValue
                  }
                >
                  {formatNumber(
                    reserved.remaining
                      .teamRemaining,
                  )}
                </Text>

                <Text
                  style={
                    styles.reserveItemLabel
                  }
                >
                  TEAM
                </Text>
              </View>

              <View
                style={
                  styles.reserveItem
                }
              >
                <Text
                  style={
                    styles.reserveItemValue
                  }
                >
                  {formatNumber(
                    reserved.remaining
                      .liquidityRemaining,
                  )}
                </Text>

                <Text
                  style={
                    styles.reserveItemLabel
                  }
                >
                  LIQUIDITY
                </Text>
              </View>
            </View>

            <View
              style={
                styles.reserveMeta
              }
            >
              <Text
                style={
                  styles.reserveMetaText
                }
              >
                Height{" "}
                {reserved.height}
              </Text>

              <Text
                style={
                  styles.reserveMetaText
                }
              >
                Explicit used{" "}
                {formatNumber(
                  reserved.explicitUsed,
                )}
              </Text>
            </View>
          </View>
        ) : (
          <View
            style={
              styles.reserveCard
            }
          >
            <Text
              style={styles.emptyText}
            >
              Reserve information is
              unavailable.
            </Text>
          </View>
        )}

        <SectionHeader
          eyebrow="ARCHITECTURE"
          title="Prism consensus"
        />

        <View
          style={
            styles.architectureCard
          }
        >
          <View
            style={
              styles.architectureNode
            }
          >
            <View
              style={[
                styles.architectureIcon,
                styles.architectureIconGold,
              ]}
            >
              <Text
                style={
                  styles.architectureIconTextGold
                }
              >
                S
              </Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text
                style={
                  styles.architectureTitle
                }
              >
                Proof of Stake
              </Text>

              <Text
                style={
                  styles.architectureDescription
                }
              >
                Secures proposer
                selection and network
                consensus.
              </Text>
            </View>
          </View>

          <View
            style={
              styles.architectureConnector
            }
          />

          <View
            style={
              styles.architectureNode
            }
          >
            <View
              style={[
                styles.architectureIcon,
                styles.architectureIconBlue,
              ]}
            >
              <Text
                style={
                  styles.architectureIconTextBlue
                }
              >
                W
              </Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text
                style={
                  styles.architectureTitle
                }
              >
                Useful Work
              </Text>

              <Text
                style={
                  styles.architectureDescription
                }
              >
                Rewards verified
                computation committed
                into Prism blocks.
              </Text>
            </View>
          </View>

          <View
            style={
              styles.architectureConnector
            }
          />

          <View
            style={
              styles.architectureNode
            }
          >
            <View
              style={[
                styles.architectureIcon,
                styles.architectureIconGreen,
              ]}
            >
              <Text
                style={
                  styles.architectureIconTextGreen
                }
              >
                P
              </Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text
                style={
                  styles.architectureTitle
                }
              >
                Participation
              </Text>

              <Text
                style={
                  styles.architectureDescription
                }
              >
                Rewards meaningful
                human-backed network
                participation.
              </Text>
            </View>
          </View>
        </View>

        {mode === "demo" ? (
          <View
            style={
              styles.demoWarning
            }
          >
            <Text
              style={
                styles.demoWarningTitle
              }
            >
              DEMO MODE
            </Text>

            <Text
              style={
                styles.demoWarningText
              }
            >
              Prism Devnet is currently
              unavailable. Explore is
              displaying bundled demo
              data until the node
              reconnects.
            </Text>
          </View>
        ) : null}

        <Text style={styles.footer}>
          Prism · PoS + PoUW + PoUP
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
      paddingTop: 14,
      paddingBottom: 115,
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
      color: "#56647c",
      fontSize: 9,
      fontWeight: "900",
      letterSpacing: 1.8,
    },

    headerTitle: {
      color: "#ffffff",
      fontSize: 34,
      fontWeight: "900",
      letterSpacing: -1,
      marginTop: 3,
    },

    headerSubtitle: {
      color: "#68778e",
      fontSize: 11,
      lineHeight: 16,
      marginTop: 3,
    },

    statusPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: "#0a2118",
      borderWidth: 1,
      borderColor: "#16452f",
    },

    statusPillDemo: {
      backgroundColor: "#2b2310",
      borderColor: "#594717",
    },

    statusPillSyncing: {
      backgroundColor: "#0d1827",
      borderColor: "#1b3554",
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
      color: "#8ebaff",
    },

    heroCard: {
      padding: 18,
      borderRadius: 22,
      backgroundColor: "#0a101b",
      borderWidth: 1,
      borderColor: "#1b2940",
    },

    heroTopRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
    },

    heroEyebrow: {
      color: "#61708a",
      fontSize: 8,
      fontWeight: "900",
      letterSpacing: 1.3,
    },

    heroTitle: {
      color: "#eef4ff",
      fontSize: 20,
      fontWeight: "900",
      marginTop: 4,
    },

    protocolBadge: {
      paddingHorizontal: 9,
      paddingVertical: 7,
      borderRadius: 10,
      backgroundColor: "#0d1726",
      borderWidth: 1,
      borderColor: "#1b3353",
    },

    protocolBadgeText: {
      color: "#76aef9",
      fontSize: 8,
      fontWeight: "900",
      letterSpacing: 0.7,
    },

    heightBlock: {
      marginTop: 23,
    },

    heightLabel: {
      color: "#55647c",
      fontSize: 8,
      fontWeight: "900",
      letterSpacing: 1.2,
    },

    heightValue: {
      color: "#ffffff",
      fontSize: 54,
      fontWeight: "900",
      letterSpacing: -2,
      marginTop: 2,
    },

    heightMeta: {
      color: "#66758c",
      fontSize: 10,
      marginTop: 2,
    },

    heroStats: {
      flexDirection: "row",
      gap: 8,
      marginTop: 20,
    },

    statCard: {
      flex: 1,
      minHeight: 72,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 13,
      backgroundColor: "#0e1522",
      borderWidth: 1,
      borderColor: "#17243a",
      paddingHorizontal: 5,
    },

    statValue: {
      color: "#eef4ff",
      fontSize: 17,
      fontWeight: "900",
    },

    statLabel: {
      color: "#57667e",
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
      color: "#64e29c",
    },

    gold: {
      color: "#e2bb69",
    },

    hashStrip: {
      marginTop: 13,
      paddingHorizontal: 12,
      paddingVertical: 11,
      borderRadius: 11,
      backgroundColor: "#070c14",
      borderWidth: 1,
      borderColor: "#151f31",
    },

    hashLabel: {
      color: "#506079",
      fontSize: 7,
      fontWeight: "900",
      letterSpacing: 1,
    },

    hashValue: {
      color: "#73829a",
      fontSize: 10,
      fontFamily: "monospace",
      marginTop: 5,
    },

    sectionHeader: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent:
        "space-between",
      gap: 12,
      marginTop: 3,
    },

    sectionEyebrow: {
      color: "#536178",
      fontSize: 8,
      fontWeight: "900",
      letterSpacing: 1.4,
    },

    sectionTitle: {
      color: "#edf3ff",
      fontSize: 20,
      fontWeight: "900",
      marginTop: 3,
    },

    sectionMetric: {
      color: "#8594aa",
      fontSize: 9,
      fontWeight: "900",
      textAlign: "right",
    },

    countBadge: {
      minWidth: 31,
      height: 31,
      paddingHorizontal: 9,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 999,
      backgroundColor: "#0e1726",
      borderWidth: 1,
      borderColor: "#1c304c",
    },

    countBadgeText: {
      color: "#7aaeff",
      fontSize: 10,
      fontWeight: "900",
    },

    activityCard: {
      borderRadius: 18,
      backgroundColor: "#090e17",
      borderWidth: 1,
      borderColor: "#182337",
      overflow: "hidden",
    },

    activityRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      minHeight: 84,
      paddingHorizontal: 15,
      paddingVertical: 13,
      borderBottomWidth:
        StyleSheet.hairlineWidth,
      borderBottomColor: "#1a2435",
    },

    activityRowLast: {
      borderBottomWidth: 0,
    },

    activityRowPressed: {
      opacity: 0.55,
      transform: [
        {
          scale: 0.99,
        },
      ],
    },

    activityIcon: {
      width: 39,
      height: 39,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#0c1c34",
      borderWidth: 1,
      borderColor: "#183a67",
    },

    activityIconHumanity: {
      backgroundColor: "#0c2119",
      borderColor: "#174830",
    },

    activityIconText: {
      color: "#68a7ff",
      fontSize: 17,
      fontWeight: "900",
    },

    activityIconTextHumanity: {
      color: "#66e39d",
      fontSize: 13,
    },

    activityTitle: {
      color: "#eaf1ff",
      fontSize: 11,
      fontWeight: "900",
      letterSpacing: 0.3,
    },

    activitySubtitle: {
      color: "#728197",
      fontSize: 9,
      marginTop: 4,
    },

    activityBlock: {
      color: "#4f5e75",
      fontSize: 8,
      marginTop: 5,
    },

    activityRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
    },

    activityReward: {
      alignItems: "flex-end",
    },

    activityRewardValue: {
      color: "#65e39c",
      fontSize: 15,
      fontWeight: "900",
    },

    activityRewardLabel: {
      color: "#56725f",
      fontSize: 7,
      fontWeight: "900",
      marginTop: 2,
    },

    activityChevron: {
      color: "#56708f",
      fontSize: 24,
      fontWeight: "400",
    },

    listCard: {
      borderRadius: 18,
      backgroundColor: "#090e17",
      borderWidth: 1,
      borderColor: "#182337",
      overflow: "hidden",
    },

    validatorRow: {
      minHeight: 76,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderBottomWidth:
        StyleSheet.hairlineWidth,
      borderBottomColor: "#1a2435",
    },

    participantRow: {
      minHeight: 79,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderBottomWidth:
        StyleSheet.hairlineWidth,
      borderBottomColor: "#1a2435",
    },

    humanityRow: {
      minHeight: 82,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderBottomWidth:
        StyleSheet.hairlineWidth,
      borderBottomColor: "#1a2435",
    },

    rowLast: {
      borderBottomWidth: 0,
    },

    rankBadge: {
      width: 34,
      height: 34,
      borderRadius: 11,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#111827",
      borderWidth: 1,
      borderColor: "#22304a",
    },

    rankBadgeTop: {
      backgroundColor: "#281f0f",
      borderColor: "#57431a",
    },

    rankText: {
      color: "#7f91ab",
      fontSize: 11,
      fontWeight: "900",
    },

    rankTextTop: {
      color: "#e2bb69",
    },

    validatorName: {
      color: "#e8effc",
      fontSize: 12,
      fontWeight: "900",
    },

    validatorAddress: {
      color: "#56657b",
      fontSize: 8,
      fontFamily: "monospace",
      marginTop: 4,
    },

    stakeWrap: {
      alignItems: "flex-end",
    },

    stakeValue: {
      color: "#e2bb69",
      fontSize: 14,
      fontWeight: "900",
    },

    stakeLabel: {
      color: "#756643",
      fontSize: 7,
      fontWeight: "900",
      marginTop: 2,
    },

    humanityBadge: {
      width: 39,
      height: 39,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#0c2119",
      borderWidth: 1,
      borderColor: "#174830",
    },

    humanityBadgeText: {
      color: "#66e39d",
      fontSize: 14,
      fontWeight: "900",
    },

    humanityName: {
      color: "#e8effc",
      fontSize: 12,
      fontWeight: "900",
    },

    humanityProvider: {
      color: "#638072",
      fontSize: 8,
      marginTop: 4,
    },

    humanityAddress: {
      color: "#4d5c70",
      fontSize: 8,
      fontFamily: "monospace",
      marginTop: 4,
    },

    blockBadge: {
      minWidth: 46,
      alignItems: "flex-end",
    },

    blockBadgeLabel: {
      color: "#526078",
      fontSize: 6,
      fontWeight: "900",
    },

    blockBadgeValue: {
      color: "#8aa0bd",
      fontSize: 12,
      fontWeight: "900",
      marginTop: 2,
    },

    participantNameRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 6,
    },

    participantName: {
      color: "#e8effc",
      fontSize: 12,
      fontWeight: "900",
    },

    verifiedMiniBadge: {
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: 999,
      backgroundColor: "#0c2119",
      borderWidth: 1,
      borderColor: "#174830",
    },

    verifiedMiniText: {
      color: "#64dc9a",
      fontSize: 6,
      fontWeight: "900",
      letterSpacing: 0.6,
    },

    participantMeta: {
      color: "#5d6b80",
      fontSize: 8,
      marginTop: 5,
    },

    scoreWrap: {
      alignItems: "flex-end",
    },

    scoreValue: {
      color: "#68a7ff",
      fontSize: 17,
      fontWeight: "900",
    },

    scoreLabel: {
      color: "#536987",
      fontSize: 7,
      fontWeight: "900",
      marginTop: 2,
    },

    workSummaryCard: {
      padding: 15,
      borderRadius: 18,
      backgroundColor: "#090e17",
      borderWidth: 1,
      borderColor: "#182337",
    },

    workSummaryStats: {
      flexDirection: "row",
      gap: 8,
    },

    workSummaryText: {
      color: "#65748a",
      fontSize: 10,
      lineHeight: 17,
      marginTop: 14,
    },

    reserveCard: {
      padding: 17,
      borderRadius: 19,
      backgroundColor: "#0a0f18",
      borderWidth: 1,
      borderColor: "#1a2639",
    },

    reserveHero: {
      paddingBottom: 15,
      borderBottomWidth:
        StyleSheet.hairlineWidth,
      borderBottomColor: "#202b3c",
    },

    reserveEyebrow: {
      color: "#58677e",
      fontSize: 8,
      fontWeight: "900",
      letterSpacing: 1.2,
    },

    reserveValue: {
      color: "#ffffff",
      fontSize: 31,
      fontWeight: "900",
      letterSpacing: -1,
      marginTop: 5,
    },

    reserveUnit: {
      color: "#647389",
      fontSize: 8,
      fontWeight: "900",
      marginTop: 3,
    },

    reserveGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 15,
    },

    reserveItem: {
      width: "48%",
      minHeight: 68,
      justifyContent: "center",
      paddingHorizontal: 12,
      borderRadius: 12,
      backgroundColor: "#0d1420",
      borderWidth: 1,
      borderColor: "#18243a",
    },

    reserveItemValue: {
      color: "#dce7f8",
      fontSize: 12,
      fontWeight: "900",
    },

    reserveItemLabel: {
      color: "#56657c",
      fontSize: 7,
      fontWeight: "900",
      marginTop: 4,
    },

    reserveMeta: {
      flexDirection: "row",
      justifyContent:
        "space-between",
      gap: 10,
      marginTop: 14,
    },

    reserveMetaText: {
      color: "#59677c",
      fontSize: 8,
    },

    architectureCard: {
      padding: 17,
      borderRadius: 18,
      backgroundColor: "#090e17",
      borderWidth: 1,
      borderColor: "#182337",
    },

    architectureNode: {
      flexDirection: "row",
      alignItems: "center",
      gap: 13,
    },

    architectureConnector: {
      width: 1,
      height: 22,
      marginLeft: 20,
      marginVertical: 6,
      backgroundColor: "#233149",
    },

    architectureIcon: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
    },

    architectureIconGold: {
      backgroundColor: "#251d0d",
      borderColor: "#503e19",
    },

    architectureIconBlue: {
      backgroundColor: "#0c1b30",
      borderColor: "#18395e",
    },

    architectureIconGreen: {
      backgroundColor: "#0b2118",
      borderColor: "#17472f",
    },

    architectureIconTextGold: {
      color: "#e2bb69",
      fontWeight: "900",
    },

    architectureIconTextBlue: {
      color: "#68a7ff",
      fontWeight: "900",
    },

    architectureIconTextGreen: {
      color: "#66e39d",
      fontWeight: "900",
    },

    architectureTitle: {
      color: "#e7effc",
      fontSize: 12,
      fontWeight: "900",
    },

    architectureDescription: {
      color: "#617087",
      fontSize: 9,
      lineHeight: 14,
      marginTop: 3,
    },

    demoWarning: {
      padding: 15,
      borderRadius: 15,
      backgroundColor: "#211c0e",
      borderWidth: 1,
      borderColor: "#4d4020",
    },

    demoWarningTitle: {
      color: "#e1bc68",
      fontSize: 9,
      fontWeight: "900",
      letterSpacing: 1.1,
    },

    demoWarningText: {
      color: "#9a8b65",
      fontSize: 10,
      lineHeight: 16,
      marginTop: 5,
    },

    emptyText: {
      color: "#5e6c81",
      fontSize: 10,
      padding: 17,
      lineHeight: 16,
    },

    footer: {
      color: "#3d4b61",
      textAlign: "center",
      fontSize: 9,
      marginTop: 7,
    },
  });