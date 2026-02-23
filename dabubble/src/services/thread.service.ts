import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, firstValueFrom, forkJoin, map, Observable, of, switchMap, take, takeUntil } from 'rxjs';
// import { BehaviorSubject, Observable, forkJoin, map, of, switchMap, take, takeUntil } from 'rxjs';
import { ChannelService } from './channel.service';
import { UserService } from './user.service';
import { User } from '../models/user.class';
import { Chat } from '../models/chat.class';
import { Answer } from '../models/answer.class';
import { RawReactionsMap, TransformedReaction } from '../models/reaction.types';
// import { reactionIcons } from '../app/reaction-icons';
import { LogoutService } from './logout.service';

@Injectable({ providedIn: 'root' })
export class ThreadService {
    private channelService = inject(ChannelService);
    private userService = inject(UserService);
    private logoutService = inject(LogoutService);
    private destroy$ = this.logoutService.logout$;

    // scrollToBottom() {
    //     setTimeout(() => {
    //         const threadHistory = document.getElementById('thread-history');
    //         if (threadHistory) {
    //             threadHistory.scrollTop = threadHistory.scrollHeight;
    //         }
    //     }, 100); 
    // }

    scrollToBottomNewMessage() {
        const threadHistory = document.getElementById('thread-history');
        threadHistory?.scrollTo({ top: threadHistory.scrollHeight, behavior: 'smooth' });
    }

    // getCurrentUserAndChannels(callback: (userId: string, channels: any[]) => void) {
    //     this.userService.getCurrentUser().pipe(take(1), takeUntil(this.destroy$)).subscribe(user => {
    //         if (!user) return;
    //         this.channelService.getChannels().pipe(take(1), takeUntil(this.destroy$)).subscribe(channels => {
    //             const filtered = channels.filter(c => Array.isArray(c.participants) && c.participants.includes(user.uid));
    //             callback(user.uid, filtered);
    //         });
    //     });
    // }
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

    /** Lädt anreicherte Chat-Daten (inkl. Userinfos, Reaktionen) */
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

    /** Lädt Antworten mit Userinfos und Reaktionsarrays */
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

    // async loadChatById(channelId: string) {
    //     this.channelService.getChannelById(channelId).pipe(take(1), takeUntil(this.destroy$)).subscribe(async channel => {
    //         if (!channel) return;

    //         this.channelId = channelId;
    //         this.channelName$ = of(channel.name);
    //         this.subscribeToParticipants();
    //     });
    // }
    // loadChatById(channelId: string): Observable<{ name$: Observable<string>; participants$: Observable<User[]> }> {
    //     return this.channelService.getChannelById(channelId).pipe(
    //         take(1),
    //         switchMap(channel => {
    //             if (!channel) return of({ name$: of('Unbekannter Kanal'), participants$: of([]) });

    //             const name$ = of(channel.name);
    //             const participants$ = this.userService.getUsersByIds(channel.participants);

    //             return of({ name$, participants$ });
    //         })
    //     );
    // }

    // subscribeToParticipants() {
    //     this.participants$.pipe(takeUntil(this.destroy$)).subscribe(users => {
    //     this.participants = users;
    //     // console.log('participants', this.participants)
    //     });
    // }

    // getAnswersForChat() {
    //     this.answers$ = this.channelService.getAnswersForChat(this.channelId, this.chatId).pipe(
    //         switchMap(answers =>
    //             this.userService.getUsersByIds(answers.map((a: any) => a.user)).pipe(
    //                 switchMap(users => {
    //                     const answerDetails$ = answers.map(answer =>
    //                         forkJoin({
    //                             reactions: this.channelService.getReactionsForAnswer(this.channelId, this.chatId, answer.id).pipe(take(1)),
    //                             user: of(users.find(u => u.uid === answer.user)),
    //                         }).pipe(
    //                             map(({ reactions, user }) => ({
    //                                 ...answer,
    //                                 userName: user?.name,
    //                                 userImg: user?.img,
    //                                 reactions,
    //                                 reactionArray: this.transformReactionsToArray(reactions, users, this.currentUserId)
    //                             }))
    //                         )
    //                     );
    //                     return forkJoin(answerDetails$);
    //                 })
    //             )
    //         )
    //     );
    //     map((enrichedAnswers: Answer[]) =>
    //         enrichedAnswers.sort((a, b) => a.time - b.time)
    //     );
    // }
    // getAnswersForChat(
    //     channelId: string,
    //     chatId: string,
    //     currentUserId: string,
    //     userService: UserService,
    //     channelService: ChannelService
    // ): Observable<Answer[]> {
    //     return channelService.getAnswersForChat(channelId, chatId).pipe(
    //         switchMap(answers =>
    //             userService.getUsersByIds(answers.map(a => a.user)).pipe(
    //                 switchMap(users => {
    //                     const answerDetails$ = answers.map(answer =>
    //                         forkJoin({
    //                             reactions: channelService.getReactionsForAnswer(channelId, chatId, answer.id).pipe(take(1)),
    //                             user: of(users.find(u => u.uid === answer.user)),
    //                         }).pipe(
    //                             map(({ reactions, user }) => ({
    //                                 ...answer,
    //                                 userName: user?.name ?? 'Ehemaliger Nutzer',
    //                                 userImg: user?.img ?? 'default-user',
    //                                 reactions,
    //                                 isUserMissing: !user,
    //                                 reactionArray: this.transformReactionsToArray(reactions, users, currentUserId)
    //                             }))
    //                         )
    //                     );
    //                     return forkJoin(answerDetails$);
    //                 })
    //             )
    //         ),
    //         map((enrichedAnswers: Answer[]) => enrichedAnswers.sort((a, b) => a.time - b.time))
    //     );
    // }

    
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

    private parseUserIds(users: string[]): string[] {
        return users.flatMap(u =>
            u.includes(',') ? u.split(',').map(id => id.trim()) : [u]
        );
    }

    private findOtherUserName(userIds: string[], currentUserId: string, participants: User[]): string | undefined {
        const others = userIds.filter(id => id !== currentUserId);
        if (others.length === 0) return undefined;
        return participants.find(u => u.uid === others[0])?.name || 'Unbekannt';
    }

    // private async saveOrDeleteReaction(channelId: string, chatId: string, reactionType: string, updatedUsers: string[]): Promise<void> {
    //     // Methode passt sich an die Map-Struktur an und ruft setReaction auf
    //     await this.channelService.setReaction(channelId, chatId, reactionType, updatedUsers);
    // }

    // private async updateReactionForChat(chatId: string, reactionType: string, updatedUsers: string[]): Promise<void> {
    //     // Hole den aktuellen Chat direkt über das Observable (du hast nur einen Chat im Thread)
    //     const chat = await firstValueFrom(this.chat$);
    //     if (!chat) return;

    //     const channelId = this.channelId;
    //     const currentUserId = this.currentUserId;
    //     if (!channelId || !chatId || !currentUserId) return;

    //     try {
    //     // await this.saveOrDeleteReaction(channelId, chatId, reactionType, updatedUsers);
    //         this.updateLocalReaction(chat, reactionType, updatedUsers);
    //     } catch (error) {
    //         console.error('Fehler beim Aktualisieren der Reaction:', error);
    //     }
    // }
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

            const updatedChat: Chat = {
                ...chat,
                reactions: newReactions,
                reactionArray: newReactionArray
            };

            return updatedChat;
        } catch (error) {
            console.error('Fehler beim Aktualisieren der Reaction:', error);
            return undefined;
        }
    }

    // updateLocalReaction(chat: any, reactionType: string, updatedUsers: string[]): void {
    //     chat.reactions = { ...chat.reactions };
    //     if (updatedUsers.length === 0) {
    //     delete chat.reactions[reactionType];
    //     } else {
    //     chat.reactions[reactionType] = updatedUsers;
    //     }
    //     chat.reactionArray = this.transformReactionsToArray(chat.reactions, this.participants, this.currentUserId);

    //     // Für einen einzelnen Chat reicht es, das Observable neu zu setzen (optional: Subject, falls weitere lokale Updates nötig sind)
    //     this.chat$ = of({ ...chat });
    // }
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

        const updatedChat: Chat = {
            ...chat,
            reactions: newReactions,
            reactionArray: newReactionArray
        };

        return updatedChat;
    }

    
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

            // lokales Update zurückgeben, damit die Component UI aktualisieren kann
            chat.reactions = { ...chat.reactions, [reactionType]: updatedUsers };
            chat.reactionArray = this.transformReactionsToArray(chat.reactions, participants, currentUserId);
            return chat;
        }

        return chat;
    }

    // async addReactionToAnswer(answerId: string, reactionType: string) {
    //     const answers = await firstValueFrom(this.answers$);
    //     const answer = answers.find(a => a.id === answerId);
    //     if (!answer) return;

    //     this.activeReactionDialogueAnswersIndex = null;
    //     this.activeReactionDialogueBelowAnswersIndex = null;

    //     const currentReactionUsers = this.extractUserIds(answer.reactions || {}, reactionType);
    //     if (!currentReactionUsers.includes(this.currentUserId)) {
    //         const updatedUsers = [...currentReactionUsers, this.currentUserId];
    //         // 4. Aktualisiere Reaction-Map in Firestore via ChannelService
    //         await this.channelService.setAnswerReaction(this.channelId, this.chatId, answerId, reactionType, updatedUsers);
    //         // 5. Lokales Update der Antwort im answers$ Observable (zwingend, damit UI synchron bleibt)
    //         answer.reactions = { ...answer.reactions, [reactionType]: updatedUsers };
    //         answer.reactionArray = this.transformReactionsToArray(answer.reactions, this.participants, this.currentUserId);

    //         // Optional: answers$ triggern, damit Template updated wird
    //         // this.answers$ = of([...answers]);
    //         return of([...answers]);
    //     }
    // }
    // async toggleReactionForAnswer(channelId: string, chatId: string, answers$: Observable<Answer[]>, answerId: string, reactionType: string, currentUserId: string, participants: User[]): Promise<Observable<Answer[]>> {
    //     const answers = await firstValueFrom(answers$);
    //     const answer = answers.find(a => a.id === answerId);
    //     if (!answer) return answers$;

    //     const currentReactionUsers = this.extractUserIds(answer.reactions || {}, reactionType);
    //     const updatedUsers = currentReactionUsers.includes(currentUserId)
    //         ? currentReactionUsers.filter(u => u !== currentUserId)
    //         : [...currentReactionUsers, currentUserId];

    //     await this.channelService.setAnswerReaction(channelId, chatId, answerId, reactionType, updatedUsers);

    //     if (updatedUsers.length === 0) {
    //         const { [reactionType]: _, ...rest } = answer.reactions!;
    //         answer.reactions = rest;
    //     } else {
    //         answer.reactions = { ...answer.reactions, [reactionType]: updatedUsers };
    //     }
    //     answer.reactionArray = this.transformReactionsToArray(answer.reactions, participants, currentUserId);

    //     return of([...answers]);
    // }
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

        // Benutzer hinzufügen, falls noch nicht reagiert
        if (!currentUsers.includes(currentUserId)) {
            const updatedUsers = [...currentUsers, currentUserId];

            await this.channelService.setAnswerReaction(channelId, chatId, answerId, reactionType, updatedUsers);

            const newReactions = { ...answer.reactions, [reactionType]: updatedUsers };
            const newReactionArray = this.transformReactionsToArray(newReactions, participants, currentUserId);

            const updatedAnswer: Answer = {
                ...answer,
                reactions: newReactions,
                reactionArray: newReactionArray
            };

            return answers.map(a => (a.id === answerId ? updatedAnswer : a));
        }

        return answers;
    }

    // async toggleReactionForChat(chatId: string, reactionType: string) {
    //     const chat = await firstValueFrom(this.chat$);
    //     if (!chat) return;

    //     const currentReactionUsers = this.extractUserIds(chat.reactions || {}, reactionType);
    //     let updatedUsers: string[];
    //     if (currentReactionUsers.includes(this.currentUserId)) {
    //         updatedUsers = currentReactionUsers.filter(uid => uid !== this.currentUserId);
    //     } else {
    //         updatedUsers = [...currentReactionUsers, this.currentUserId];
    //     }

    //     await this.saveOrDeleteReaction(this.channelId, chatId, reactionType, updatedUsers);
    //     await this.updateReactionForChat(chatId, reactionType, updatedUsers);
    // }
    async toggleReactionForChat(
        channelId: string,
        chat$: Observable<Chat | undefined>,
        reactionType: string,
        currentUserId: string,
        participants: User[]
    ): Promise<Chat | undefined> {
        const chat = await firstValueFrom(chat$);
        if (!chat) return undefined;

        // Nutzer, die bereits reagiert haben
        const currentUsers = this.extractUserIds(chat.reactions || {}, reactionType);

        // Nutzer hinzufügen oder entfernen
        const updatedUsers = currentUsers.includes(currentUserId)
            ? currentUsers.filter(u => u !== currentUserId)
            : [...currentUsers, currentUserId];

        // Speichern in Firestore
        await this.channelService.setReaction(channelId, chat.id, reactionType, updatedUsers);

        // Lokales Update spiegeln
        const updatedChat = await this.updateReactionForChat(
            of(chat),          // wir reichen das aktuelle Chat-Observable
            participants,
            currentUserId,
            reactionType,
            updatedUsers
        );

        return updatedChat;
    }

    // async toggleReactionForAnswer(answerId: string, reactionType: string) {
    //     // console.log('toggleReactionForAnswer answerId', answerId, 'reactionType', reactionType);
    //     const answers = await firstValueFrom(this.answers$);
    //     const answer = answers.find(a => a.id === answerId);
    //     if (!answer) return;

    //     const currentReactionUsers = this.extractUserIds(answer.reactions || {}, reactionType);
    //     let updatedUsers: string[];
    //     if (currentReactionUsers.includes(this.currentUserId)) {
    //         updatedUsers = currentReactionUsers.filter(uid => uid !== this.currentUserId);
    //     } else {
    //      updatedUsers = [...currentReactionUsers, this.currentUserId];
    //     }

    //     await this.channelService.setAnswerReaction(this.channelId, this.chatId, answerId, reactionType, updatedUsers);

    //     if (updatedUsers.length === 0) {
    //         const { [reactionType]: _, ...rest } = answer.reactions!;
    //         answer.reactions = rest;
    //     } else {
    //         answer.reactions = { ...answer.reactions, [reactionType]: updatedUsers };
    //     }
    //     answer.reactionArray = this.transformReactionsToArray(answer.reactions, this.participants, this.currentUserId);

    //     // this.answers$ = of([...answers]);
    //     return of([...answers]);
    // }
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

        const updatedAnswer: Answer = {
            ...answer,
            reactions: newReactions,
            reactionArray: newReactionArray
        };

        // aktualisiertes Answer‑Array zurückgeben
        return answers.map(a => (a.id === answerId ? updatedAnswer : a));
    }

    private extractUserIds(reactions: Record<string, any>, reactionType: string): string[] {
        const usersRaw = reactions[reactionType] || [];
        return usersRaw.flatMap((u: string) =>
            u.includes(',') ? u.split(',').map((x: string) => x.trim()) : [u]
        );
    }

    // async submitAnswer() {
    //     if (this.isSubmitting || !this.canSendMessage()) return;
        
    //     this.isSubmitting = true; 
    //     const answer = this.buildAnswerPayload();
    //     try {
    //         await this.channelService.addAnswerToChat(this.channelId, this.chatId, answer);
    //         this.answerAdded.emit({ chatId: this.chatId!, answerTime: answer.time });
    //         this.newAnswer = '';
    //         // setTimeout(() => this.scrollToBottom());
    //         [0, 50, 150].forEach(delay => 
    //             setTimeout(() => this.scrollToBottomNewMessage(), delay)
    //         );
    //     } catch (err) {
    //         console.error('Fehler beim Senden der Antwort:', err);
    //     } finally {
    //         this.isSubmitting = false;
    //     }
    // }
    // async submitAnswer() {
    //     if (this.isSubmitting || !this.newAnswer.trim()) return;
    //     this.isSubmitting = true;

    //     const answer = this.buildAnswerPayload(this.newAnswer, this.currentUserId);

    //     try {
    //         await this.channelService.addAnswerToChat(this.channelId, this.chatId, answer);
    //         // await this.threadService.submitAnswer(this.channelId, this.chatId, answer);
    //         this.answerAdded.emit({ chatId: this.chatId, answerTime: answer.time });
    //         this.newAnswer = '';
    //         [0, 50, 150].forEach(d => setTimeout(() => this.scrollToBottomNewMessage(), d));
    //     } finally {
    //         this.isSubmitting = false;
    //     }
    // }
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
    
    /** Baut die Datenstruktur für eine neue Antwort auf */
    buildAnswerPayload(text: string, currentUserId: string) {
        return {
        message: text.trim(),
        time: Math.floor(Date.now() / 1000),
        user: currentUserId
        };
    }

    // async saveEditedAnswer(answer: Answer) {
    //     const newText = answer.editedText?.trim();
    //     if (!newText || newText === answer.message) {
    //         answer.isEditing = false;
    //         return;
    //     }
    //     await this.channelService.updateAnswerMessage(
    //         this.channelId,
    //         this.chatId,
    //         answer.id,
    //         newText
    //     );
    //     answer.message = newText;
    //     answer.isEditing = false;
    // }
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
            return {
            ...answer,
            message: trimmed,
            isEditing: false
            };
        } catch (error) {
            console.error('Fehler beim Speichern der bearbeiteten Antwort:', error);
            return undefined;
        }
    }
}   