import { Chat } from "./chat.class";

export interface ChatWithDetails extends Chat {
  userName?: string;
  userImg?: string;
  answersCount?: number;
  lastAnswerTime?: number;
  message: string;
  reactions?: any;
  reactionArray?: any[];
}