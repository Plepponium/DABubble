export interface AnswerWithDetails {
  id: string;
  message: string;
  time: number;
  user: string;
  userName?: string;
  userImg?: string;
  reactions?: any;
  reactionArray?: any[];
}