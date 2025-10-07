// import { Answer } from "./answer.class";

// export type AnswerWithDetails = {
//   id: string;
//   message: string;
//   time: number;
//   user: string;
//   userName?: string;
//   userImg?: string;
//   reactions: Record<string, string[]>;
//   reactionArray: any[];
// };

// export interface AnswerWithDetails {
//   id: string;
//   message: string;
//   time: number;
//   user: string;
//   userName?: string;
//   userImg?: string;
//   reactions?: Record<string, string[]>;
//   reactionArray?: {
//     type: string,
//     count: number,
//     userIds: string[],
//     currentUserReacted: boolean,
//     otherUserName?: string,
//     otherUserReacted: boolean
//   }[];
// }
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
// export interface AnswerWithDetails extends Answer {
//     userName?: string;
//     userImg?: string;
//     reactions?: any;
//     reactionArray?: any[];
// }