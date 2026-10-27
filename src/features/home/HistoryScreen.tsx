/**
 * History: your household's recent scans, newest first.
 *
 * Each row reopens that scan exactly as it was decided, from the verdict and
 * reasons stored in the scans table. The list reloads whenever you come back
 * to this tab, so a scan you just made is at the top.
 *
 * The header and the list share one View with no gap of their own: the
 * SectionHeader already leaves space.s7 under itself, and Screen's gap on
 * top of that left a hole above the first scan.
 */
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { Screen } from '@/components/Screen';
import { EmptyState, ListGroup, ListRow, SectionHeader, Snackbar } from '@/components/design-system';
import { AskNjamHeader } from '@/features/ask-njam/AskNjamHeader';
import { fetchRecentScans, type ScanRecord } from '@/features/verdict/scans';
import type { VerdictState } from '@/services/verdict';

const VERDICT_WORDS: Record<VerdictState, string> = {
  safe: 'Safe',
  caution: 'Caution',
  unsafe: 'Not safe',
};

function whenScanned(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

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
          <ListGroup>
            {scans.map((scan) => (
              <ListRow
                key={scan.id}
                title={scan.productName ?? 'Product from a label photo'}
                supporting={`${VERDICT_WORDS[scan.verdict]} for ${scan.profileName ?? 'your profile'} · ${whenScanned(scan.scannedAt)}`}
                supportingVerdict={scan.verdict}
                trailing="chevron"
                onPress={() => router.push({ pathname: '/verdict', params: { scanId: scan.id } })}
              />
            ))}
          </ListGroup>
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
