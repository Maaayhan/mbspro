export interface MbsItem {
  code: string;
  title: string;
  description: string;
  fee: number;
  timeThreshold?: number;
  flags: Record<string, any>;
  mutuallyExclusiveWith: string[];
  references: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MbsItemRow {
  code: string;
  title: string;
  description: string;
  fee: number;
  time_threshold?: number;
  flags: {
    telehealth?: boolean;
    after_hours?: boolean;
    [key: string]: any;
  };
  mutually_exclusive_with: string[];
  reference_docs: string[];
  created_at: Date;
  updated_at: Date;
}
