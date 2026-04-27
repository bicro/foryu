import statsRaw from "../public/stats.json";

export type Stats = {
  _placeholder?: boolean;
  vocab_size: number;
  computed_at: string;
  followers_gained: number;
  followers_goal: number;
};

export const stats = statsRaw as Stats;

export type VocabModel = { id: string; idf: number; likes: number };
export type Vocab = { n_users: number; models: VocabModel[] };
