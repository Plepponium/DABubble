export type RawReactionsMap = Record<string, string[] | string>;

export type TransformedReaction = {
  type: string;
  count: number;
  userIds: string[];
  currentUserReacted: boolean;
  otherUserName?: string;
  otherUserReacted: boolean;
};