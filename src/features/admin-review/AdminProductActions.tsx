/**
 * AdminProductActions: "Edit" and "Delete" for one product, for an admin.
 *
 * Used on the review queue cards and on the Verdict screen, so a product can
 * be fixed wherever an admin finds the mistake. It draws nothing for anyone
 * who is not an admin. The database refuses them anyway (see product-admin.ts).
 *
 *   Edit   - a sheet with the name, brand, barcode and the ingredient list,
 *            one field per ingredient in label order, each removable, and
 *            "Add an ingredient" at the end.
 *   Delete - asks first, because it removes the product for every household.
 *
 * The screen passes onEdited and onDeleted, so it can load the product again
 * or leave once it is gone.
 */
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BottomSheet, Button, ConfirmDialog, Snackbar, TextField } from '@/components/design-system';
import { BarcodeTakenError, deleteProduct, updateProduct } from '@/features/admin-review/product-admin';
import { useAuth } from '@/features/auth/AuthProvider';
import { space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

export type EditableProduct = {
  id: string;
  name: string;
  brand: string | null;
  barcode: string;
  /** In label order, each once. */
  ingredients: string[];
};

type AdminProductActionsProps = {
  product: EditableProduct;
  onEdited: () => void;
  onDeleted: () => void;
};

/** What went wrong with a save, and which field it belongs to. */
type SaveError = { field: 'name' | 'barcode' | 'sheet'; text: string };

/** The fields of the edit sheet, as typed. */
type Draft = { name: string; brand: string; barcode: string; ingredients: string[] };

function draftFrom(product: EditableProduct): Draft {
  return {
    name: product.name,
    brand: product.brand ?? '',
    barcode: product.barcode,
    ingredients: product.ingredients,
  };
}

export function AdminProductActions({ product, onEdited, onDeleted }: AdminProductActionsProps) {
  const { colors } = useNjamTheme();
  const { member } = useAuth();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<SaveError | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  if (member?.role !== 'admin') return null;

  function startEditing() {
    setSaveError(null);
    setDraft(draftFrom(product));
  }

  function setIngredient(index: number, name: string) {
    setDraft((current) =>
      current && { ...current, ingredients: current.ingredients.map((item, at) => (at === index ? name : item)) },
    );
  }

  function removeIngredient(index: number) {
    setDraft((current) => current && { ...current, ingredients: current.ingredients.filter((_, at) => at !== index) });
  }

  function addIngredient() {
    setDraft((current) => current && { ...current, ingredients: [...current.ingredients, ''] });
  }

  async function save() {
    if (!draft) return;
    if (draft.name.trim() === '') {
      setSaveError({ field: 'name', text: 'Enter the name on the pack.' });
      return;
    }
    if (draft.barcode.trim() === '') {
      setSaveError({ field: 'barcode', text: 'Enter the barcode number under the bars.' });
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await updateProduct(product.id, draft);
      setDraft(null);
      onEdited();
    } catch (error) {
      setSaveError(
        error instanceof BarcodeTakenError
          ? { field: 'barcode', text: 'Another product already has this barcode. Check the number on the pack.' }
          : { field: 'sheet', text: 'We could not save your changes. Check your connection and try again.' },
      );
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setConfirmingDelete(false);
    try {
      await deleteProduct(product.id);
      onDeleted();
    } catch {
      setFailure(`We could not delete ${product.name}. Check your connection and try again.`);
    }
  }

  return (
    <>
      <View style={styles.row}>
        <View style={styles.half}>
          <Button label="Edit" icon="edit" variant="tonal" fullWidth onPress={startEditing} />
        </View>
        <View style={styles.half}>
          <Button label="Delete" icon="delete" variant="outlined" fullWidth onPress={() => setConfirmingDelete(true)} />
        </View>
      </View>

      <BottomSheet
        visible={draft !== null}
        title={`Edit ${product.name}`}
        subtitle="Changes show for every household."
        onClose={() => setDraft(null)}
        footer={
          <Button
            label="Save changes"
            icon="check"
            variant="secondary"
            fullWidth
            loading={saving}
            loadingLabel="Saving"
            onPress={save}
          />
        }>
        {draft && (
          <>
            <TextField
              label="Name"
              value={draft.name}
              onChangeText={(name) => setDraft({ ...draft, name })}
              error={saveError?.field === 'name' ? saveError.text : undefined}
            />
            <TextField label="Brand" value={draft.brand} onChangeText={(brand) => setDraft({ ...draft, brand })} />
            <TextField
              label="Barcode"
              value={draft.barcode}
              keyboardType="number-pad"
              onChangeText={(barcode) => setDraft({ ...draft, barcode })}
              error={saveError?.field === 'barcode' ? saveError.text : undefined}
            />
            {draft.ingredients.map((ingredient, index) => (
              <TextField
                // The position is the identity here: two rows can hold the same text while typing.
                key={index}
                label={`Ingredient ${index + 1}`}
                value={ingredient}
                autoCapitalize="none"
                onChangeText={(name) => setIngredient(index, name)}
                trailingIcon="close"
                trailingLabel={`Remove ${ingredient || `ingredient ${index + 1}`}`}
                onTrailingPress={() => removeIngredient(index)}
              />
            ))}
            <Button label="Add an ingredient" icon="add" variant="text" onPress={addIngredient} />
            {saveError?.field === 'sheet' && (
              // The same ink a field uses for its error: a form problem, not a verdict.
              <Text style={[typography.bodyS, { color: colors.verdictUnsafeInk }]}>{saveError.text}</Text>
            )}
          </>
        )}
      </BottomSheet>

      <ConfirmDialog
        visible={confirmingDelete}
        icon="delete"
        title={`Delete ${product.name}?`}
        body="It goes from the catalogue for every household, with its ingredient list and nutrition. Past scans of it stay in history. This cannot be undone."
        cancelLabel="Keep product"
        confirmLabel="Delete"
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={remove}
      />

      {failure && <Snackbar kind="failure" message={failure} onDismiss={() => setFailure(null)} />}
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: space.s2,
  },
  half: {
    flex: 1,
  },
});
