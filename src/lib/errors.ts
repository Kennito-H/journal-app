export type JournalError =
  | { name: "EntryNotFound"; message: string }
  | { name: "InvalidContent"; message: string }
  | { name: "ValidationError"; message: string }
  | { name: "UnexpectedDependencyError"; message: string }
  | { name: 'InvalidTagError'; message: string};

export const EntryNotFound = (message: string): JournalError => ({
  name: "EntryNotFound",
  message,
});

export const InvalidContent = (message: string): JournalError => ({
  name: "InvalidContent",
  message,
});

export const ValidationError = (message: string): JournalError => ({
  name: "ValidationError",
  message,
});


export const InvalidTagError = (message: string): JournalError => ({
  name: 'InvalidTagError',
  message,
});