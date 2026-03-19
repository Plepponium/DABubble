import { Injectable, inject } from '@angular/core';
import { firstValueFrom, map, Observable, of, switchMap, take } from 'rxjs';
import { ChannelService } from './channel.service';
import { UserService } from './user.service';
import { User } from '../models/user.class';
import { Chat } from '../models/chat.class';
import { Answer } from '../models/answer.class';
import { RawReactionsMap, TransformedReaction } from '../models/reaction.types';

@Injectable({ providedIn: 'root' })
export class ThreadService {
    private channelService = inject(ChannelService);
    private userService = inject(UserService);

    /** Scrolls the thread history container to the bottom after a short delay. */
    scrollToBottom() {
        setTimeout(() => {
            const threadHistory = document.getElementById('thread-history');
            if (threadHistory) {
                threadHistory.scrollTop = threadHistory.scrollHeight;
            }
        }, 100); 
    }

    /** Smoothly scrolls the thread history container to the bottom. */
    scrollToBottomNewMessage() {
        const threadHistory = document.getElementById('thread-history');
        threadHistory?.scrollTo({ top: threadHistory.scrollHeight, behavior: 'smooth' });
    }

    /** Retrieves the current user ID and filters channels where the user is a participant. */
    getCurrentUserAndChannels(): Observable<{ userId: string; channels: any[] }> {
        return this.userService.getCurrentUser().pipe(
            take(1),
            switchMap(user => {
                if (!user) return of({ userId: '', channels: [] }); // kein User angemeldet
                return this.channelService.getChannels().pipe(
                    take(1),
                    map(channels => ({
                        userId: user.uid,
                        channels: channels.filter(
                            c => Array.isArray(c.participants) && c.participants.includes(user.uid)
                        )
                    }))
                );
            })
        );
    }

    /** Loads a channel by ID and returns observables for its name and participants. */
    loadChannelWithId(channelId: string): Observable<{ channelName$: Observable<string>; participants$: Observable<User[]> }> {
        return this.channelService.getChannelById(channelId).pipe(
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
    getEnrichedChat(channelId: string, chatId: string, participants$: Observable<User[]>, currentUserId: string): Observable<Chat | undefined> {
        return this.channelService.getChatsForChannel(channelId).pipe(
            switchMap(chats =>
                participants$.pipe(
                    map(users => {
                        const chat = chats.find(c => c.id === chatId);
                        if (!chat) return undefined;
                        const user = users.find(u => u.uid === chat.user);
                        const isUserMissing = !user;

                        return {
                            ...chat,
                            userName: isUserMissing ? 'Ehemaliger Nutzer' : user.name,
                            userImg: user?.img ?? 'default-user',
                            isUserMissing,
                            reactionArray: this.transformReactionsToArray(chat.reactions, users, currentUserId)
                        };
                    })
                )
            )
        );
    }

    /** Retrieves all answers for a chat enriched with user metadata and reactions. */
    getEnrichedAnswers(channelId: string, chatId: string, participants$: Observable<User[]>, currentUserId: string): Observable<Answer[]> {
        return this.channelService.getAnswersForChat(channelId, chatId).pipe(
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
    async updateReactionForChat(
        chat$: Observable<Chat | undefined>,
        participants: User[],
        currentUserId: string,
        reactionType: string,
        updatedUsers: string[]
    ): Promise<Chat | undefined> {
        try {
            const chat = await firstValueFrom(chat$);
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
    updateLocalReaction(
        chat: Chat,
        reactionType: string,
        updatedUsers: string[],
        participants: User[],
        currentUserId: string
    ): Chat {
        const newReactions = { ...chat.reactions };

        if (updatedUsers.length === 0) {
            delete newReactions[reactionType];
        } else {
            newReactions[reactionType] = updatedUsers;
        }

        const newReactionArray = this.transformReactionsToArray(newReactions, participants, currentUserId);
        const updatedChat: Chat = { ...chat, reactions: newReactions, reactionArray: newReactionArray };

        return updatedChat;
    }

    /** Adds a reaction to a chat if the current user has not already reacted. */
    async addReaction(
        channelId: string, 
        chat$: Observable<Chat | undefined>,
        reactionType: string, 
        currentUserId: string, 
        participants: User[]
    ): Promise<Chat | undefined> {
        const chat = await firstValueFrom(chat$);
        if (!chat) return;

        const currentReactionUsers = this.extractUserIds(chat.reactions || {}, reactionType);
        if (!currentReactionUsers.includes(currentUserId)) {
            const updatedUsers = [...currentReactionUsers, currentUserId];
            await this.channelService.setReaction(channelId, chat.id, reactionType, updatedUsers);

            chat.reactions = { ...chat.reactions, [reactionType]: updatedUsers };
            chat.reactionArray = this.transformReactionsToArray(chat.reactions, participants, currentUserId);
            return chat;
        }

        return chat;
    }

    /** Adds a reaction to an answer and returns the updated answers array. */
    async addReactionToAnswer(
        channelId: string,
        chatId: string,
        answers$: Observable<Answer[]>,
        answerId: string,
        reactionType: string,
        currentUserId: string,
        participants: User[]
    ): Promise<Answer[] | undefined> {
        const answers = await firstValueFrom(answers$);
        const answer = answers.find(a => a.id === answerId);
        if (!answer) return undefined;

        const currentUsers = this.extractUserIds(answer.reactions || {}, reactionType);

        if (!currentUsers.includes(currentUserId)) {
            const updatedUsers = [...currentUsers, currentUserId];

            await this.channelService.setAnswerReaction(channelId, chatId, answerId, reactionType, updatedUsers);

            const newReactions = { ...answer.reactions, [reactionType]: updatedUsers };
            const newReactionArray = this.transformReactionsToArray(newReactions, participants, currentUserId);
            const updatedAnswer: Answer = { ...answer, reactions: newReactions, reactionArray: newReactionArray };

            return answers.map(a => (a.id === answerId ? updatedAnswer : a));
        }

        return answers;
    }

    /** Toggles the current user's reaction on a chat and returns the updated chat. */
    async toggleReactionForChat(
        channelId: string,
        chat$: Observable<Chat | undefined>,
        reactionType: string,
        currentUserId: string,
        participants: User[]
    ): Promise<Chat | undefined> {
        const chat = await firstValueFrom(chat$);
        if (!chat) return undefined;

        const currentUsers = this.extractUserIds(chat.reactions || {}, reactionType);
        const updatedUsers = currentUsers.includes(currentUserId)
            ? currentUsers.filter(u => u !== currentUserId)
            : [...currentUsers, currentUserId];

        await this.channelService.setReaction(channelId, chat.id, reactionType, updatedUsers);
        const updatedChat = await this.updateReactionForChat( of(chat), participants, currentUserId, reactionType, updatedUsers );

        return updatedChat;
    }

    /** Toggles the current user's reaction on an answer and returns updated answers. */
    async toggleReactionForAnswer(
        channelId: string,
        chatId: string,
        answers$: Observable<Answer[]>,
        answerId: string,
        reactionType: string,
        currentUserId: string,
        participants: User[]
    ): Promise<Answer[] | undefined> {
        const answers = await firstValueFrom(answers$);
        const answer = answers.find(a => a.id === answerId);
        if (!answer) return undefined;

        const currentUsers = this.extractUserIds(answer.reactions || {}, reactionType);

        const updatedUsers = currentUsers.includes(currentUserId)
            ? currentUsers.filter(u => u !== currentUserId)
            : [...currentUsers, currentUserId];

        await this.channelService.setAnswerReaction(channelId, chatId, answerId, reactionType, updatedUsers);
        const newReactions =
            updatedUsers.length === 0
            ? Object.fromEntries(Object.entries(answer.reactions || {}).filter(([key]) => key !== reactionType))
            : { ...answer.reactions, [reactionType]: updatedUsers };

        const newReactionArray = this.transformReactionsToArray(newReactions, participants, currentUserId);
        const updatedAnswer: Answer = { ...answer, reactions: newReactions, reactionArray: newReactionArray };

        return answers.map(a => (a.id === answerId ? updatedAnswer : a));
    }

    /** Extracts and normalizes user IDs for a specific reaction type. */
    private extractUserIds(reactions: Record<string, any>, reactionType: string): string[] {
        const usersRaw = reactions[reactionType] || [];
        return usersRaw.flatMap((u: string) =>
            u.includes(',') ? u.split(',').map((x: string) => x.trim()) : [u]
        );
    }

    /** Submits a new answer to a chat and returns submission status and timestamp. */
    async submitAnswer(
        channelId: string,
        chatId: string,
        messageText: string,
        currentUserId: string
    ): Promise<{ success: boolean; answerTime?: number }> {
        const trimmed = messageText.trim();
        if (!trimmed) return { success: false };

        const answer = {
            message: trimmed,
            time: Math.floor(Date.now() / 1000),
            user: currentUserId
        };

        try {
            await this.channelService.addAnswerToChat(channelId, chatId, answer);
            return { success: true, answerTime: answer.time };
        } catch (error) {
            console.error('Fehler beim Senden der Antwort:', error);
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
    async saveEditedAnswer(
        channelId: string,
        chatId: string,
        answer: Answer,
        newText: string
    ): Promise<Answer | undefined> {
        const trimmed = newText.trim();
        if (!trimmed || trimmed === answer.message) {
            return { ...answer, isEditing: false }; // keine Änderung
        }

        try {
            await this.channelService.updateAnswerMessage(channelId, chatId, answer.id, trimmed);
            return { ...answer, message: trimmed, isEditing: false };
        } catch (error) {
            console.error('Fehler beim Speichern der bearbeiteten Antwort:', error);
            return undefined;
        }
    }
}   