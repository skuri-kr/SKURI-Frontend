export const restoreComposerDraftAfterEdit = ({
  currentValue,
  previousDraft,
  submittedValue,
}: {
  currentValue: string;
  previousDraft: string;
  submittedValue: string;
}) => (currentValue === submittedValue ? previousDraft : currentValue);
