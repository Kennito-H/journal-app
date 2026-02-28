export interface IJournalEntry {
  addTag(normalizedTag: string): unknown;
  id: string;  
  content: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export class JournalEntry implements IJournalEntry {
  id: string;
  content: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;

  constructor(id: string, content: string) {
    this.id = id;
    this.content = content;
    this.tags = [];
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  updateContent(newContent: string): void {
    this.content = newContent;
    this.updatedAt = new Date();
  }

  addTag(tag: string): void {
    if (!this.tags.includes(tag)) {
      this.tags.push(tag);
      this.updatedAt = new Date();
    }
  }
}

export function createJournalEntry(id: string, content: string): IJournalEntry {
  return new JournalEntry(id, content);
}