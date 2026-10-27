/**
 * History: your household's recent scans, newest first.
 *
 * Each scan is a ScanCard with its first reason, so you can see why it got
 * its verdict without opening it. A card reopens that scan exactly as it was
 * decided, from the verdict and reasons stored in the scans table. The list
 * reloads whenever you come back to this tab, so a scan you just made is at
 * the top.
 *
 * The header and the list share one View with no gap of their own: the
 * SectionHeader already leaves space.s7 under itself, and Screen's gap on
 * top of that left a hole above the first scan.
 */
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { EmptyState, SectionHeader, Snackbar } from '@/components/design-system';
import { AskNjamHeader } from '@/features/ask-njam/AskNjamHeader';
import { ScanCard } from '@/features/home/ScanCard';
import { fetchRecentScans, type ScanRecord } from '@/features/verdict/scans';
import { space } from '@/theme/tokens';

export function HistoryScreen() {
  const [scans, setScans] = useState<ScanRecord[] | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    fetchRecentScans()
      .then((found) => {
        setScans(found);
        setFailed(false);
      })
      .catch(() => setFailed(true));
  }, []);

  useFocusEffect(load);

  return (
    <Screen withTabBar topBar={{ title: 'Your scans', hideUntilScrolled: true }}>
      <View>
        <AskNjamHeader>
          <SectionHeader headline="Your scans" deck="Everything your household scanned, newest first." />
        </AskNjamHeader>

        {scans !== null && scans.length === 0 && (
          <EmptyState
            icon="history"
            headline="You have not scanned anything yet"
            body="Every product you check is kept here, with the reasons it got its verdict."
            actionLabel="Scan a barcode"
            actionIcon="barcode_scanner"
            onAction={() => router.navigate('/scan')}
          />
        )}

        {scans !== null && scans.length > 0 && (
          <View style={styles.cards}>
            {scans.map((scan) => (
              <ScanCard
                key={scan.id}
                scan={scan}
                onPress={() => router.push({ pathname: '/verdict', params: { scanId: scan.id } })}
              />
            ))}
          </View>
        )}
      </View>

      {failed && (
        <Snackbar
          kind="failure"
          message="We could not load your scans."
          actionLabel="Retry"
          onAction={load}
          onDismiss={() => setFailed(false)}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  // space.s4 is the gap between cards in a list.
  cards: {
    gap: space.s4,
  },
});
