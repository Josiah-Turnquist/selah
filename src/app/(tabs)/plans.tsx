import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { Copy, Link2, UserPlus, X } from 'lucide-react-native';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { ThemedText } from '@/components/themed-text';
import { TextField } from '@/components/ui/field';
import { Button, Card, IconButton, Pill } from '@/components/ui/primitives';
import { ProgressBar, ProgressRing } from '@/components/ui/progress';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { Sheet } from '@/components/ui/sheet';
import { useToast } from '@/components/ui/toast';
import { Spacing } from '@/constants/theme';
import { addFriend, apiConfigured, createAccount, removeFriend } from '@/lib/api/client';
import { planStats } from '@/lib/plans/progress';
import { TEMPLATES, type PlanTemplate } from '@/lib/plans/templates';
import { useActions, useData } from '@/lib/store/store';
import { useTheme } from '@/hooks/use-theme';

export default function PlansScreen() {
  const data = useData();
  const actions = useActions();
  const theme = useTheme();
  const toast = useToast();

  const [showAddFriend, setShowAddFriend] = useState(false);
  const [code, setCode] = useState('');
  const [adding, setAdding] = useState(false);
  const creating = useRef(false);

  const activeIds = new Set(data.plans.map((p) => p.templateId));
  const available = TEMPLATES.filter((t) => !activeIds.has(t.id));

  const startAndOpen = (tpl: PlanTemplate) => router.push(`/plan/${actions.startPlan(tpl)}`);

  // The add-friend sheet needs our friend code, so make sure the anonymous
  // account exists by the time it's open (SyncManager usually has already).
  useEffect(() => {
    if (!showAddFriend || data.account || !apiConfigured() || creating.current) return;
    creating.current = true;
    createAccount(data.settings.displayName || 'Friend')
      .then((a) => actions.setAccount(a))
      .catch(() => {})
      .finally(() => {
        creating.current = false;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAddFriend, data.account]);

  const submitFriendCode = async () => {
    const account = data.account;
    if (!account || !code.trim()) return;
    setAdding(true);
    try {
      const friends = await addFriend(account, code);
      actions.setFriends(friends);
      setCode('');
      setShowAddFriend(false);
      toast('Friend added');
    } catch (e: any) {
      toast(e?.message === 'api_404' ? 'No one has that code' : 'Couldn’t add — check the code');
    } finally {
      setAdding(false);
    }
  };

  const unfriend = (id: string, name: string) => {
    // Optimistic — the next sync re-pulls server truth either way.
    actions.setFriends(data.friends.filter((f) => f.id !== id));
    if (data.account) removeFriend(data.account, id).catch(() => {});
    toast(`Removed ${name}`);
  };

  return (
    <Screen scroll tab>
      <ScreenHeader
        title="Plans"
        right={<IconButton icon={Link2} onPress={() => router.push('/import')} accessibilityLabel="Import a plan" />}
      />

      {data.plans.length > 0 ? (
        <>
          <SectionLabel>Your plans</SectionLabel>
          {data.plans.map((p) => {
            const s = planStats(p);
            return (
              <Card key={p.id} style={styles.spaced} onPress={() => router.push(`/plan/${p.id}`)}>
                <View style={styles.planRow}>
                  <ProgressRing value={s.pct} size={64}>
                    <ThemedText type="caption" style={{ fontWeight: '700' }}>
                      {Math.round(s.pct * 100)}%
                    </ThemedText>
                  </ProgressRing>
                  <View style={{ flex: 1 }}>
                    <ThemedText type="h3">{p.title}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {s.completedCount} of {p.durationDays} days
                    </ThemedText>
                    <View style={{ marginTop: 6, flexDirection: 'row' }}>
                      {s.finished ? (
                        <Pill tone="success" label="Complete" />
                      ) : s.behind > 2 ? (
                        <Pill tone="ember" label="Pick back up" />
                      ) : s.behind > 0 ? (
                        <Pill tone="ember" label={`${s.behind} day${s.behind > 1 ? 's' : ''} behind`} />
                      ) : (
                        <Pill tone="accent" label="On track" />
                      )}
                    </View>
                  </View>
                </View>
              </Card>
            );
          })}
        </>
      ) : null}

      {apiConfigured() ? (
        <>
          <View style={styles.friendsHead}>
            <ThemedText type="label" themeColor="textTertiary">
              Friends
            </ThemedText>
            <Pressable
              onPress={() => setShowAddFriend(true)}
              hitSlop={8}
              accessibilityLabel="Add a friend"
              style={({ pressed }) => [styles.addFriend, pressed && { opacity: 0.6 }]}>
              <UserPlus size={15} color={theme.accent} />
              <ThemedText type="caption" themeColor="accent">
                Add
              </ThemedText>
            </Pressable>
          </View>
          {data.friends.length === 0 ? (
            <Card>
              <ThemedText type="small" themeColor="textSecondary">
                Trade codes with a friend and you’ll see each other’s reading progress here.
              </ThemedText>
            </Card>
          ) : (
            data.friends.map((f) => {
              const pct = f.durationDays ? f.completedDays / f.durationDays : 0;
              return (
                <Card key={f.id} style={styles.spacedSm}>
                  <View style={styles.friendRow}>
                    <Avatar name={f.name} />
                    <View style={{ flex: 1 }}>
                      <View style={styles.friendHead}>
                        <ThemedText type="h3">{f.name}</ThemedText>
                        <View style={styles.friendMeta}>
                          <ThemedText type="small" themeColor="textSecondary">
                            {Math.round(pct * 100)}%
                          </ThemedText>
                          <Pressable
                            onPress={() => unfriend(f.id, f.name)}
                            hitSlop={8}
                            accessibilityLabel={`Remove ${f.name}`}>
                            <X size={14} color={theme.textTertiary} />
                          </Pressable>
                        </View>
                      </View>
                      <ThemedText type="caption" themeColor="textSecondary" style={{ marginBottom: 6 }}>
                        {f.planTitle || 'No plan yet'}
                      </ThemedText>
                      <ProgressBar value={pct} height={6} />
                    </View>
                  </View>
                </Card>
              );
            })
          )}
        </>
      ) : null}

      {available.length > 0 ? (
        <>
          <SectionLabel>Start a plan</SectionLabel>
          {available.map((t) => (
            <Card key={t.id} style={styles.spacedSm}>
              <ThemedText type="h3">{t.title}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={{ marginTop: 2 }}>
                {t.subtitle}
              </ThemedText>
              <View style={styles.startRow}>
                <Pill label={`${t.durationDays} days`} />
                <Button size="sm" title="Start" onPress={() => startAndOpen(t)} />
              </View>
            </Card>
          ))}
        </>
      ) : null}

      <Sheet visible={showAddFriend} onClose={() => setShowAddFriend(false)} title="Add a friend">
        <ThemedText type="small" themeColor="textSecondary">
          Trade codes with a friend — you’ll see each other’s plan progress. No account or email needed.
        </ThemedText>
        <View style={[styles.codeBox, { backgroundColor: theme.backgroundElement }]}>
          {data.account ? (
            <>
              <ThemedText type="display" style={styles.myCode}>
                {data.account.friendCode}
              </ThemedText>
              <Button
                size="sm"
                variant="secondary"
                icon={Copy}
                title="Copy"
                onPress={() => {
                  Clipboard.setStringAsync(data.account!.friendCode);
                  toast('Code copied');
                }}
              />
            </>
          ) : (
            <ThemedText type="small" themeColor="textSecondary">
              Connecting…
            </ThemedText>
          )}
        </View>
        <TextField
          label="Friend’s code"
          value={code}
          onChangeText={setCode}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder="e.g. K7MPQ2"
        />
        <Button title="Add friend" disabled={!code.trim() || !data.account || adding} onPress={submitFriendCode} />
      </Sheet>
    </Screen>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <ThemedText type="label" themeColor="textTertiary" style={styles.sectionLabel}>
      {children}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  spaced: { marginBottom: Spacing.three },
  spacedSm: { marginBottom: Spacing.two },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  friendRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  friendHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  friendMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  friendsHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.five,
    marginBottom: Spacing.two,
  },
  addFriend: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  myCode: { letterSpacing: 4 },
  startRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.three },
  sectionLabel: { marginTop: Spacing.five, marginBottom: Spacing.two },
});
