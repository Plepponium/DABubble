import { Injectable } from "@angular/core";
import { RawReactionsMap, TransformedReaction } from "../models/reaction.types";
import { User } from '../models/user.class';
import { Chat } from '../models/chat.class';
import { BehaviorSubject } from "rxjs";

@Injectable({ providedIn: 'root' })
export class ChatsReactionService {

  transformReactionsToArray(
    reactionsMap: RawReactionsMap,
    participants: User[],
    currentUserId: string
  ): TransformedReaction[] {
    if (!reactionsMap) return [];

    return Object.entries(reactionsMap)
    .map(([type, usersRaw]) =>
        this.transformSingleReaction(type, usersRaw, participants, currentUserId)
    )
    .sort((a, b) => a.type.localeCompare(b.type));
  }

  private transformSingleReaction(
    type: string,
    usersRaw: string[] | string,
    participants: User[],
    currentUserId: string
  ): TransformedReaction {
    const userIds = this.parseUserIds(Array.isArray(usersRaw) ? usersRaw : [usersRaw]);
    const currentUserReacted = this.hasCurrentUserReacted(userIds, currentUserId);
    const otherUserName = this.findOtherUserName(userIds, currentUserId, participants);
    const otherUserReacted = this.haveOtherUsersReacted(userIds, currentUserId);

    return {
    type,
    count: userIds.length,
    userIds,
    currentUserReacted,
    otherUserName,
    otherUserReacted,
    };
  }

  private parseUserIds(users: string[]): string[] {
    return users.flatMap(u => u.includes(',') ? u.split(',').map(id => id.trim()) : [u]);
  }
  
  private findOtherUserName(userIds: string[], currentUserId: string, participants: User[]): string | undefined {
    const others = userIds.filter(id => id !== currentUserId);
    if (others.length === 0) return undefined;
    return participants.find(u => u.uid === others[0])?.name || 'Unbekannt';
  }

  private hasCurrentUserReacted(userIds: string[], currentUserId: string): boolean {
    return userIds.includes(currentUserId);
  }

  private haveOtherUsersReacted(userIds: string[], currentUserId: string): boolean {
    return userIds.filter(id => id !== currentUserId).length > 1;
  }

  updateLocalReaction(chat: any, reactionType: string, updatedUsers: string[], chatIndex: number, chatsSubject: BehaviorSubject<Chat[]>, participants: User[], currentUserId: string) {
    chat.reactions = { ...chat.reactions };
    if (updatedUsers.length === 0) {
      delete chat.reactions[reactionType];
    } else {
      chat.reactions[reactionType] = updatedUsers;
    }
    chat.reactionArray = this.transformReactionsToArray(chat.reactions, participants, currentUserId);

    const chats = chatsSubject.getValue();
    const newChats = [...chats];
    newChats[chatIndex] = chat; 
    chatsSubject.next(newChats);
  }

  extractUserIds(reactions: Record<string, any>, reactionType: string): string[] {
    let usersRaw = reactions[reactionType];
    if (!usersRaw) return [];

    if (!Array.isArray(usersRaw)) {
    usersRaw = [usersRaw];
    }

    return usersRaw.flatMap((u: string) =>
    u.includes(',') ? u.split(',').map((x: string) => x.trim()) : [u]
    );
  }
}