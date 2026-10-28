/**
 * Draws one Ask Njam answer block with design-system components.
 *
 *   text    - an assistant ChatBubble.
 *   product - the product's card, its VerdictChip with the first reason,
 *             and "View product". The app loads the product and the verdict
 *             engine decides the chip. The AI only chose which product.
 *   recipe  - title, ingredients and method. An ingredient that is a
 *             catalogue product gets that product's chip. Any other
 *             ingredient is checked as far as the AI's allergen tag allows:
 *             a broken rule shows Not safe, and anything else says "Not
 *             checked against your rules", never Safe.
 *   label   - not from the AI: the verdict for an ingredient list you added
 *             from a label photo with "+", drawn under your question as
 *             soon as you send it (LabelReadBlock). It says it was read
 *             from your photo and not yet checked by our team.
 *   suggestions are not drawn here: the screen shows them as chips above
 *   the composer.
 *
 * The verdict is worked out again every time a block is drawn, so an old
 * conversation shows today's verdict for today's rules.
 */
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  Button,
  ChatBubble,
  Icon,
  LoadingMark,
  ProductCard,
  VerdictChip,
} from '@/components/design-system';
import { ingredientsRead } from '@/features/ask-njam/AttachmentPreview';
import { fetchProductById, productDetail, type CatalogueProduct } from '@/features/verdict/catalogue';
import type { AskBlock, LabelRead, RecipeIngredient } from '@/services/ai';
import { decideVerdict, type ProfileRule, type Verdict } from '@/services/verdict';
import { icon, space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

type Checked =
  | { kind: 'loading' }
  | { kind: 'shown'; product: CatalogueProduct; verdict: Verdict }
  | { kind: 'missing' };

/** Loads a catalogue product and runs the verdict engine on it, as the Verdict screen does. */
function useCatalogueVerdict(productId: string, rules: ProfileRule[]): Checked {
  const [checked, setChecked] = useState<Checked>({ kind: 'loading' });

  useEffect(() => {
    // Ignore an answer that lands after this block has gone or changed.
    let current = true;
    fetchProductById(productId)
      .then((product) => {
        if (!current) return;
        if (!product) {
          setChecked({ kind: 'missing' });
          return;
        }
        const verdict = decideVerdict(
          {
            verified: product.verified,
            readFromLabel: false,
            fromOpenFoodFacts: product.source === 'open_food_facts',
            ingredients: product.ingredients,
            mayContain: product.mayContain,
          },
          rules,
        );
        setChecked({ kind: 'shown', product, verdict });
      })
      .catch(() => current && setChecked({ kind: 'missing' }));
    return () => {
      current = false;
    };
  }, [productId, rules]);

  return checked;
}

/* ------------------------------------------------------------------ */
/* Product                                                             */
/* ------------------------------------------------------------------ */

function ProductBlock({ productId, rules }: { productId: string; rules: ProfileRule[] }) {
  const { colors } = useNjamTheme();
  const checked = useCatalogueVerdict(productId, rules);

  if (checked.kind === 'loading') {
    return (
      <ChatBubble from="assistant">
        <View style={styles.inline}>
          <LoadingMark size={icon.sizeSm} color={colors.brandForest} />
          <Text style={[typography.bodyS, { color: colors.inkMuted }]}>Checking this product against your rules</Text>
        </View>
      </ChatBubble>
    );
  }

  if (checked.kind === 'missing') {
    return <ChatBubble from="assistant" text="We could not load this product. It may have been removed." />;
  }

  const { product, verdict } = checked;
  return (
    <ChatBubble from="assistant">
      <ProductCard
        variant="identity"
        name={product.name}
        detail={productDetail(product)}
        imageUrl={product.imageUrl ?? undefined}
        metaIcon={product.verified ? 'verified' : 'info'}
        metaText={product.verified ? 'Verified' : 'Not yet checked by our team'}
      />
      {/* Mark, word and reason together: a verdict is never colour alone. */}
      <VerdictChip state={verdict.state} />
      <Text style={[typography.bodyS, { color: colors.inkMuted }]}>{verdict.reasons[0]?.text}</Text>
      <Button
        label="View product"
        fullWidth
        onPress={() => router.push({ pathname: '/verdict', params: { productId: product.id } })}
      />
    </ChatBubble>
  );
}

/* ------------------------------------------------------------------ */
/* Label read                                                          */
/* ------------------------------------------------------------------ */

/**
 * The verdict for an ingredient list read from your label photo, worked out
 * here by the verdict engine exactly as the Verdict screen does for a label
 * read. The AI read the label; it does not decide.
 */
export function LabelReadBlock({ read, photoUri, rules }: { read: LabelRead; photoUri: string; rules: ProfileRule[] }) {
  const { colors } = useNjamTheme();
  const verdict = decideVerdict(
    {
      verified: false,
      readFromLabel: true,
      readConfidence: read.confidence,
      ingredients: read.ingredients.map((item) => ({ ...item, canonicalName: null })),
      mayContain: read.mayContain,
    },
    rules,
  );

  return (
    <ChatBubble from="assistant">
      <ProductCard
        variant="identity"
        name={read.productName ?? 'Product from your label photo'}
        detail={ingredientsRead(read)}
        imageUrl={photoUri}
        metaIcon="info"
        metaText="Read from your photo, not yet checked by our team"
      />
      {/* Mark, word and reason together: a verdict is never colour alone. */}
      <VerdictChip state={verdict.state} />
      <Text style={[typography.bodyS, { color: colors.inkMuted }]}>{verdict.reasons[0]?.text}</Text>
    </ChatBubble>
  );
}

/* ------------------------------------------------------------------ */
/* Recipe                                                              */
/* ------------------------------------------------------------------ */

function NotChecked() {
  const { colors } = useNjamTheme();
  return (
    <View style={styles.inline}>
      <Icon name="info" size="xs" color={colors.inkMuted} />
      <Text style={[typography.bodyS, { color: colors.inkMuted }]}>Not checked against your rules</Text>
    </View>
  );
}

/** An ingredient that is a catalogue product: that product's verdict. */
function CatalogueIngredient({ item, productId, rules }: { item: RecipeIngredient; productId: string; rules: ProfileRule[] }) {
  const { colors } = useNjamTheme();
  const checked = useCatalogueVerdict(productId, rules);

  return (
    <View style={styles.ingredient}>
      <Text style={[typography.body, { color: colors.ink }]}>
        {checked.kind === 'shown' ? `${item.name} (${checked.product.name})` : item.name}
      </Text>
      {checked.kind === 'shown' && <VerdictChip state={checked.verdict.state} />}
      {checked.kind === 'missing' && <NotChecked />}
    </View>
  );
}

/**
 * An ingredient in words only, e.g. "butter". The engine can only see the
 * allergen and E-number the AI tagged it with, so it can prove a rule is
 * broken but never that one is kept. Broken shows Not safe; anything else
 * is "Not checked against your rules".
 */
function FreeIngredient({ item, rules }: { item: RecipeIngredient; rules: ProfileRule[] }) {
  const { colors } = useNjamTheme();
  const verdict = decideVerdict(
    {
      verified: false,
      readFromLabel: false,
      ingredients: [{ name: item.name, canonicalName: null, allergen: item.allergen, eNumber: item.eNumber }],
      mayContain: [],
    },
    rules,
  );

  return (
    <View style={styles.ingredient}>
      <Text style={[typography.body, { color: colors.ink }]}>{item.name}</Text>
      {verdict.state === 'unsafe' ? (
        <>
          <VerdictChip state="unsafe" />
          <Text style={[typography.bodyS, { color: colors.inkMuted }]}>{verdict.reasons[0]?.text}</Text>
        </>
      ) : (
        <NotChecked />
      )}
    </View>
  );
}

function RecipeBlock({ block, rules }: { block: Extract<AskBlock, { type: 'recipe' }>; rules: ProfileRule[] }) {
  const { colors } = useNjamTheme();

  return (
    <ChatBubble from="assistant">
      <Text accessibilityRole="header" style={[typography.title, { color: colors.ink }]}>
        {block.title}
      </Text>

      <View style={styles.section}>
        <Text style={[typography.label, { color: colors.inkMuted }]}>Ingredients</Text>
        {block.ingredients.map((item, index) =>
          item.productId ? (
            <CatalogueIngredient key={index} item={item} productId={item.productId} rules={rules} />
          ) : (
            <FreeIngredient key={index} item={item} rules={rules} />
          ),
        )}
      </View>

      <View style={styles.section}>
        <Text style={[typography.label, { color: colors.inkMuted }]}>Method</Text>
        {block.steps.map((step, index) => (
          <Text key={index} style={[typography.body, { color: colors.ink }]}>
            {`${index + 1}. ${step}`}
          </Text>
        ))}
      </View>
    </ChatBubble>
  );
}

/* ------------------------------------------------------------------ */
/* Any block                                                           */
/* ------------------------------------------------------------------ */

export function AnswerBlock({ block, rules }: { block: AskBlock; rules: ProfileRule[] }) {
  if (block.type === 'text') return <ChatBubble from="assistant" text={block.text} />;
  if (block.type === 'product') return <ProductBlock productId={block.productId} rules={rules} />;
  if (block.type === 'recipe') return <RecipeBlock block={block} rules={rules} />;
  return null;
}

const styles = StyleSheet.create({
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s2,
  },
  section: {
    gap: space.s2,
  },
  ingredient: {
    gap: space.s1,
  },
});
