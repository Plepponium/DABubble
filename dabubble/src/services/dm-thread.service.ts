import { Injectable, inject } from '@angular/core';
import { firstValueFrom, map, Observable, of, Subject, switchMap, take } from 'rxjs';
import { ChannelService } from './channel.service';
import { UserService } from './user.service';
import { User } from '../models/user.class';
import { Chat } from '../models/chat.class';
import { Answer } from '../models/answer.class';
import { RawReactionsMap, TransformedReaction } from '../models/reaction.types';
import { DirectMessageService } from './direct-messages.service';

@Injectable({ providedIn: 'root' })
export class DmThreadService {
    private channelService = inject(ChannelService);
    private userService = inject(UserService);
    private dmService = inject(DirectMessageService);
    private answerAddedSubject = new Subject<{ dmChatId: string; answerTime: number }>();

    /** Scrolls the thread history container to the bottom after a short delay. */
    scrollToBottom() {
        setTimeout(() => {
            // const threadHistory = document.getElementById('thread-history');
            const chatScrollContainer = document.getElementById('chat-scroll-container');
            if (chatScrollContainer) {
                chatScrollContainer.scrollTop = chatScrollContainer.scrollHeight;
            }
        }, 100);
    }

    /** Smoothly scrolls the thread history container to the bottom. */
    scrollToBottomNewMessage() {
        const chatScrollContainer = document.getElementById('chat-scroll-container');
        chatScrollContainer?.scrollTo({ top: chatScrollContainer.scrollHeight, behavior: 'smooth' });
    }

    /** Loads a channel by ID and returns observables for its name and participants. */
    loadDmChannelWithId(dmChannelId: string): Observable<{ channelName$: Observable<string>; participants$: Observable<User[]> }> {
        return this.channelService.getChannelById(dmChannelId).pipe(
            take(1),
            map(channel => {
                if (!channel) throw new Error('Channel not found');
                const channelName$ = of(channel.name);
                const participants$ = this.userService.getUsersByIds(channel.participants);
                return { channelName$, participants$ };
            })
        );
    }

    /** Retrieves a chat enriched with user metadata and transformed reactions. */
    getEnrichedDmChat(dmChannelId: string, dmChatId: string, participants$: Observable<User[]>, currentUserId: string) {
        return this.dmService.getMessages(dmChannelId).pipe(
            switchMap(chats =>
                participants$.pipe(
                    map(users => {
                        const rawChat = chats.find(c => c.id === dmChatId);
                        if (!rawChat) return undefined;
                        const user = users.find(u => u.uid === rawChat.senderId);
                        const isUserMissing = !user;
                        return {
                            id: rawChat.id,
                            message: rawChat.text,
                            time: rawChat.sentAt?.seconds || 0,
                            user: rawChat.senderId,
                            userName: user ? user.name : 'Ehemaliger Nutzer',
                            userImg: user?.img ?? 'default-user',
                            isUserMissing,
                            reactions: rawChat.reactions || {},
                            reactionArray: this.transformReactionsToArray(rawChat.reactions || {}, users, currentUserId)
                        } as Chat;
                    })
                )
            )
        );
    }

    /** Retrieves answers for a chat enriched with user metadata and transformed reactions. */
    getEnrichedDmAnswers(dmChannelId: string, dmChatId: string, participants$: Observable<User[]>, currentUserId: string): Observable<Answer[]> {
        return this.dmService.getAnswersForMessage(dmChannelId, dmChatId).pipe(
            switchMap(answers =>
                participants$.pipe(
                    map(users =>
                        answers.map(answer => {
                            const user = users.find(u => u.uid === answer.user);
                            const isUserMissing = !user;
                            return {
                                ...answer,
                                userName: isUserMissing ? 'Ehemaliger Nutzer' : user.name,
                                userImg: user?.img ?? 'default-user',
                                isUserMissing,
                                reactionArray: this.transformReactionsToArray(answer.reactions, users, currentUserId)
                            };
                        })
                        .sort((a, b) => (a.time || 0) - (b.time || 0))
                    )
                )
            )
        );
    }

    /** Converts a raw reactions map into a sorted array with metadata and user context. */
    transformReactionsToArray(reactionsMap: RawReactionsMap | undefined, participants: User[], currentUserId: string): TransformedReaction[] {
        if (!reactionsMap) return [];
        return Object.entries(reactionsMap).map(([type, usersRaw]) => {
            const userIds = this.parseUserIds(Array.isArray(usersRaw) ? usersRaw : [usersRaw]);
            return { type, userIds };
        }).filter(({ userIds }) => userIds.length > 0).map(({ type, userIds }) => {
            const currentUserReacted = userIds.includes(currentUserId);
            const otherUserName = this.findOtherUserName(userIds, currentUserId, participants);
            const otherUserReacted = userIds.filter(id => id !== currentUserId).length > 1;
            return { type, count: userIds.length, userIds, currentUserReacted, otherUserName, otherUserReacted };
        })
            .sort((a, b) => a.type.localeCompare(b.type));
    }

    /** Parses and normalizes user IDs from reaction entries. */
    private parseUserIds(users: string[]): string[] {
        return users.flatMap(u =>
            u.includes(',') ? u.split(',').map(id => id.trim()) : [u]
        );
    }

    /** Finds the name of another reacting user excluding the current user. */
    private findOtherUserName(userIds: string[], currentUserId: string, participants: User[]): string | undefined {
        const others = userIds.filter(id => id !== currentUserId);
        if (others.length === 0) return undefined;
        return participants.find(u => u.uid === others[0])?.name || 'Unbekannt';
    }

    /** Updates reaction data for a chat and returns an updated chat object. */
    async updateReactionForChat(dmChat$: Observable<Chat | undefined>, participants: User[], currentUserId: string, reactionType: string, updatedUsers: string[]): Promise<Chat | undefined> {
        try {
            const chat = await firstValueFrom(dmChat$);
            if (!chat) return undefined;
            const newReactions = { ...chat.reactions };
            if (updatedUsers.length === 0) {
                delete newReactions[reactionType];
            } else {
                newReactions[reactionType] = updatedUsers;
            }
            const newReactionArray = this.transformReactionsToArray(newReactions, participants, currentUserId);
            const updatedChat: Chat = { ...chat, reactions: newReactions, reactionArray: newReactionArray };
            return updatedChat;
        } catch (error) {
            console.error('Fehler beim Aktualisieren der Reaction:', error);
            return undefined;
        }
    }

    /** Updates reaction data locally for a chat without persisting changes. */
    updateLocalReaction( dmChat: Chat, reactionType: string, updatedUsers: string[], participants: User[], currentUserId: string ): Chat {
        const newReactions = { ...dmChat.reactions };

        if (updatedUsers.length === 0) {
            delete newReactions[reactionType];
        } else {
            newReactions[reactionType] = updatedUsers;
        }

        const newReactionArray = this.transformReactionsToArray(newReactions, participants, currentUserId);
        const updatedChat: Chat = { ...dmChat, reactions: newReactions, reactionArray: newReactionArray };

        return updatedChat;
    }

    /** Adds a reaction to a chat if the current user has not already reacted. */
    async addReaction(dmId: string, dmChat$: Observable<Chat | undefined>, reactionType: string, currentUserId: string, participants: User[]): Promise<Chat | undefined> {
        const chat = await firstValueFrom(dmChat$);
        if (!chat) return;
        const currentReactionUsers = this.extractUserIds(chat.reactions || {}, reactionType);
        if (!currentReactionUsers.includes(currentUserId)) {
            const updatedUsers = [...currentReactionUsers, currentUserId];
            await this.dmService.addReactionToMessage(dmId, chat.id, reactionType, currentUserId);
            chat.reactions = {
                ...chat.reactions,
                [reactionType]: updatedUsers
            };
            chat.reactionArray = this.transformReactionsToArray(
                chat.reactions,
                participants,
                currentUserId
            );
            return chat;
        }
        return chat;
    }

    /** Adds a reaction to an answer and returns the updated answers array. */
    async addReactionToAnswer(dmChannelId: string, dmChatId: string, answers$: Observable<Answer[]>, answerId: string, reactionType: string, currentUserId: string, participants: User[]): Promise<Answer[] | undefined> {
        const answers = await firstValueFrom(answers$);
        const answer = answers.find(a => a.id === answerId);
        if (!answer) return undefined;
        const currentUsers = this.extractUserIds(answer.reactions || {}, reactionType);
        if (!currentUsers.includes(currentUserId)) {
            const updatedUsers = [...currentUsers, currentUserId];
            await this.dmService.addReactionToAnswer(dmChannelId, dmChatId, answerId, reactionType, currentUserId);
            const newReactions = {...(answer.reactions || {}), [reactionType]: updatedUsers};
            const newReactionArray = this.transformReactionsToArray(newReactions, participants, currentUserId);
            const updatedAnswer: Answer = {...answer, reactions: newReactions, reactionArray: newReactionArray};
            return answers.map(a => (a.id === answerId ? updatedAnswer : a));
        }
        return answers;
    }

    /** Toggles the current user's reaction on a chat and returns the updated chat. */
    async toggleReactionForChat(dmId: string, dmChat$: Observable<Chat | undefined>, reactionType: string, currentUserId: string, participants: User[]): Promise<Chat | undefined> {
        const chat = await firstValueFrom(dmChat$);
        if (!chat) return undefined;
        const currentUsers = this.extractUserIds(chat.reactions || {}, reactionType);
        const userHasReacted = currentUsers.includes(currentUserId);
        const updatedUsers = userHasReacted
            ? currentUsers.filter(u => u !== currentUserId)
            : [...currentUsers, currentUserId];
        if (userHasReacted) {
            await this.dmService.removeReactionFromMessage(dmId, chat.id, reactionType, currentUserId);
        } else {
            await this.dmService.addReactionToMessage(dmId, chat.id, reactionType, currentUserId);
        }
        return this.updateReactionForChat(of(chat), participants, currentUserId, reactionType, updatedUsers);
    }

    /** Toggles the current user's reaction on an answer and returns the updated answers array. */
    async toggleReactionForAnswer( dmId: string, messageId: string, answerId: string, answers$: Observable<Answer[]>, reactionType: string, currentUserId: string, participants: User[] ): Promise<Answer[] | undefined> {
        const answers = await firstValueFrom(answers$);
        const answer = this.findAnswerById(answers, answerId);
        if (!answer) return undefined;

        const { updatedUsers, userHasReacted } = this.toggleUserInReaction(answer, reactionType, currentUserId);
        await this.persistAnswerReactionToggle( dmId, messageId, answerId, reactionType, currentUserId, userHasReacted, updatedUsers );

        return this.updateAnswersLocally( answers, answerId, reactionType, updatedUsers, participants, currentUserId );
    }

    /** Finds an answer by its ID from a list of answers. */
    private findAnswerById(answers: Answer[], answerId: string): Answer | undefined {
        return answers.find(a => a.id === answerId);
    }

    /** Toggles the current user's presence in a reaction's user list and returns updated users and reaction status. */
    private toggleUserInReaction( answer: Answer, reactionType: string, currentUserId: string ): { updatedUsers: string[]; userHasReacted: boolean } {
        const currentUsers = answer.reactions?.[reactionType]
            ? this.parseUserIds(
                Array.isArray(answer.reactions[reactionType])
                ? answer.reactions[reactionType]
                : [answer.reactions[reactionType]]
            )
            : [];

        const userHasReacted = currentUsers.includes(currentUserId);
        const updatedUsers = userHasReacted
            ? currentUsers.filter(id => id !== currentUserId)
            : [...currentUsers, currentUserId];

        return { updatedUsers, userHasReacted };
    }

    /** Persists the reaction toggle for an answer by adding or removing the current user's reaction. */
    private async persistAnswerReactionToggle( dmId: string, messageId: string, answerId: string, reactionType: string, currentUserId: string, userHasReacted: boolean, updatedUsers: string[] ): Promise<void> {
        if (userHasReacted) {
            if (updatedUsers.length === 0) {
                await this.dmService.deleteReactionTypeFromAnswer(dmId, messageId, answerId, reactionType);
            } else {
                await this.dmService.removeReactionFromAnswer(dmId, messageId, answerId, reactionType, currentUserId);
            }
        } else {
            await this.dmService.addReactionToAnswer(dmId, messageId, answerId, reactionType, currentUserId);
        }
    }

    /** Updates the reactions for an answer locally and returns the updated answers array. */
    private updateAnswersLocally( answers: Answer[], answerId: string, reactionType: string, updatedUsers: string[], participants: User[], currentUserId: string ): Answer[] {
        return answers.map(a => {
            if (a.id !== answerId) return a;
            const newReactions = { ...(a.reactions || {}) };

            if (updatedUsers.length === 0) {
                delete newReactions[reactionType];
            } else {
                newReactions[reactionType] = updatedUsers;
            }

            return {
                ...a,
                reactions: newReactions,
                reactionArray: this.transformReactionsToArray(newReactions, participants, currentUserId)
            };
        });
    }

    /** Extracts and normalizes user IDs for a specific reaction type. */
    private extractUserIds(reactions: Record<string, any>, reactionType: string): string[] {
        const usersRaw = reactions[reactionType] || [];
        return usersRaw.flatMap((u: string) =>
            u.includes(',') ? u.split(',').map((x: string) => x.trim()) : [u]
        );
    }

    /** Submits a new answer to a chat and returns submission status and timestamp. */
    async submitAnswer(dmChannelId: string, dmChatId: string, text: string, currentUserId: string): Promise<{ success: boolean; answerTime?: number }> {
        const trimmed = text.trim();
        if (!trimmed) return { success: false };
        const time = Math.floor(Date.now() / 1000);
        const answer = { message: trimmed, time, user: currentUserId };
        try {
            await this.dmService.addAnswerToMessage(dmChannelId, dmChatId, answer);
            return { success: true, answerTime: time };
        } catch (e) {
            console.error('Fehler beim Senden der DM-Antwort:', e);
            return { success: false };
        }
    }

    /** Builds a payload object for creating a new answer. */
    buildAnswerPayload(text: string, currentUserId: string) {
        return {
            message: text.trim(),
            time: Math.floor(Date.now() / 1000),
            user: currentUserId
        };
    }

    /** Saves an edited answer message and returns the updated answer object. */
       async saveEditedAnswer(dmChannelId: string, dmChatId: string, answer: Answer, newText: string): Promise<Answer | undefined> {
        const trimmed = newText.trim();
        if (!trimmed || trimmed === answer.message) {
            return { ...answer, isEditing: false }; 
        }

        try {
            await this.dmService.updateAnswerMessage(dmChannelId, dmChatId, answer.id, trimmed);
            return { ...answer, message: trimmed, isEditing: false };
        } catch (error) {
            console.error('Fehler beim Speichern der bearbeiteten Antwort:', error);
            return undefined;
        }
    }

    /** Loads and enriches a chat with user data, reactions, and answers. */
    notifyAnswerAdded(event: { dmChatId: string; answerTime: number }) {
        this.answerAddedSubject.next(event);
    }
}   