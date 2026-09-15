export type StepProps<T> = {
  defaultValues?: T;
  isSaving: boolean;
  onSave: (data: T) => void | Promise<void>;
};

export type NavigableStepProps<T> = StepProps<T> & {
  onBack: () => void;
};
