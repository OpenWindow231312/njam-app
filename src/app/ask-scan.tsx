/**
 * The Scanner, opened from "+" in Ask Njam. It brings what it finds back to
 * the chat instead of opening a Verdict. `start=label` opens it straight on
 * "Photograph the ingredient list".
 */
import { useLocalSearchParams } from 'expo-router';

import { ScannerScreen } from '@/features/scanner/ScannerScreen';

export default function AskScan() {
  const { start } = useLocalSearchParams<{ start?: string }>();
  return <ScannerScreen returnTo="ask" start={start === 'label' ? 'label' : 'barcode'} />;
}
