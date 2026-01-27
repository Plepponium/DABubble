import { Chat } from "./chat.class";
import { TransformedReaction, RawReactionsMap } from "./reaction.types";

export interface ChatWithDetails extends Chat {
    userName?: string;
    userImg?: string;
    answersCount?: number;
    lastAnswerTime?: number;
    // reactions?: any;
    // reactionArray?: any[];
    // reactions?: RawReactionsMap;
    // reactionArray?: TransformedReaction[];
}