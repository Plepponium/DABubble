import { Answer } from "./answer.class";
export interface Chat {
  editedText: string;
  isEditing: boolean;
  id: string;
  message: string;
  time: number;
  user: string;
  reactions?: Record<string, string[] | string>;
  reactionArray?: Array<{
    type: string;
    count: number;
    userIds: string[];
    currentUserReacted: boolean;
    otherUserName?: string;
    otherUserReacted: boolean;
  }>;
  answers?: Answer[];
  answersCount?: number;
  lastAnswerTime?: number | null;
  userName?: string;
  userImg?: string;
}