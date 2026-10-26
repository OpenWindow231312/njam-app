/**
 * ProductTile: a product in a horizontal shelf on Home ("Safe for Anika",
 * "Saved by your household", "Recently scanned").
 *
 * Since option E (26 Oct 2026) it is the same white card as the grid, so a
 * product looks the same on a shelf, in Search and in an aisle. It only
 * fixes the card to the shelf width; everything else is ProductGridCard.
 */
import { ProductGridCard } from '@/components/design-system/ProductGridCard';
import type { VerdictState } from '@/components/design-system/VerdictMark';

type ProductTileProps = {
  name: string;
  brand?: string | null;
  size?: string | null;
  verdict: VerdictState;
  imageUrl?: string | null;
  saved?: boolean;
  onPress: () => void;
  onToggleSave?: () => void;
};

export function ProductTile(props: ProductTileProps) {
  return <ProductGridCard {...props} shelf />;
}
