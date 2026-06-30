'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import {
  categoryNamesMatch,
  validateHelpTutorialCategoryName,
} from '@/lib/help/help-tutorial-categories';

interface HelpTutorialCategoryFieldProps {
  categories: string[];
  value: string;
  onChange: (value: string) => void;
  onAddCategory: (name: string) => Promise<string[]>;
  disabled?: boolean;
  onError?: (message: string) => void;
}

export function HelpTutorialCategoryField({
  categories,
  value,
  onChange,
  onAddCategory,
  disabled = false,
  onError,
}: HelpTutorialCategoryFieldProps) {
  const [newCategory, setNewCategory] = useState('');
  const [adding, setAdding] = useState(false);

  async function handleAddCategory() {
    const validationError = validateHelpTutorialCategoryName(newCategory);
    if (validationError) {
      onError?.(validationError);
      return;
    }

    if (categories.some((category) => categoryNamesMatch(category, newCategory))) {
      onError?.('This category already exists.');
      return;
    }

    setAdding(true);
    try {
      const nextCategories = await onAddCategory(newCategory);
      const normalized = newCategory.trim().replace(/\s+/g, ' ');
      const created =
        nextCategories.find((category) => categoryNamesMatch(category, normalized)) ??
        normalized;
      onChange(created);
      setNewCategory('');
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Could not add category.');
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="space-y-2">
      <label className="mb-1.5 block text-xs font-medium text-muted">Category</label>
      <select
        value={value}
        disabled={disabled || categories.length === 0}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-border bg-surface-base px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
      >
        {categories.length === 0 ? (
          <option value="">No categories yet</option>
        ) : null}
        {categories.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>

      <div className="flex gap-2">
        <input
          type="text"
          value={newCategory}
          disabled={disabled || adding}
          onChange={(event) => setNewCategory(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void handleAddCategory();
            }
          }}
          placeholder="New category name"
          maxLength={60}
          className="min-w-0 flex-1 rounded-lg border border-border bg-surface-base px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
        />
        <button
          type="button"
          onClick={() => void handleAddCategory()}
          disabled={disabled || adding || !newCategory.trim()}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border-strong px-3 py-2 text-xs font-semibold text-muted transition hover:border-primary/40 hover:text-primary disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          {adding ? 'Adding…' : 'Add'}
        </button>
      </div>
      <p className="text-xs text-subtle">
        Pick an existing category or add a new one for this upload.
      </p>
    </div>
  );
}
