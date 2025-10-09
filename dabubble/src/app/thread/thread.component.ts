import { Component, Output, EventEmitter, Input, inject, OnInit, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule} from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { RoundBtnComponent } from '../round-btn/round-btn.component';
import { BehaviorSubject, combineLatest, filter, firstValueFrom, forkJoin, map, Observable, of, switchMap, take } from 'rxjs';
import { ChannelService } from '../../services/channel.service';
import { UserService } from '../../services/user.service';
import { User } from '../../models/user.class';
import { Chat } from '../../models/chat.class';
import { ChatWithDetails } from '../../models/chat-with-details.class';
import { Answer } from '../../models/answer.class';
import { reactionIcons } from '../reaction-icons';

@Component({
  selector: 'app-thread',
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatIconModule, MatButtonModule, RoundBtnComponent],
  templateUrl: './thread.component.html',
  styleUrl: './thread.component.scss'
})
export class ThreadComponent implements OnInit {
  editCommentDialogueExpanded = false;
  activeReactionDialogueIndex: string | null = null;
  activeReactionDialogueBelowIndex: string | null = null;

  currentUserId: string = '';
  participantIds: string[] = [];
  participants: User[] = [];
  channelChats: any[] = [];
  reactionIcons = reactionIcons;
  reactionArray: { type: string, count: number, user: string[] }[] = [];
  newMessage: string = '';

  channelName$: Observable<string> = of('');
  participants$: Observable<User[]> = of([]);
  // chat$!: Observable<ChatWithDetails>;
  chat$!: Observable<Chat | undefined>;
  answers$!: Observable<Answer[]>;

  private chatsSubject = new BehaviorSubject<ChatWithDetails[]>([]);
  public chats$ = this.chatsSubject.asObservable();

  channelService = inject(ChannelService);
  userService = inject(UserService);
  
  @Input() channelId!: string;
  @Input() chatId!: string;
  // @Input() participants: User[] = [];
  @Output() closeThread = new EventEmitter<void>();

  // constructor(
  //   private channelService: ChannelService,
  //   private userService: UserService
  // ) {}

  // ngOnInit() {
  //   // console.log('ngOnInit chatId', this.chatId, 'ngOnInit channelId', this.channelId);
  //   this.getCurrentUser();
  //   // this.loadChannel();
  //   this.loadChannelWithId(this.channelId);
  //   this.loadChatById(this.channelId);
  //   this.chat$ = this.getChatObservable();
  //   this.getAnswersForChat();
  // }
  ngOnInit() {
    this.getCurrentUser();
    this.loadChannelWithId(this.channelId);
    this.chat$ = this.getEnrichedChat();
    this.answers$ = this.getEnrichedAnswers();
    
    this.answers$.pipe(take(1)).subscribe(answers => {
      console.log('Thread Answers:', answers);
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    this.getCurrentUser();
    this.loadChannelWithId(this.channelId);
    this.chat$ = this.getEnrichedChat();
    this.answers$ = this.getEnrichedAnswers();
    // this.loadChannel();
    // this.loadChannelWithId(this.channelId);
    // this.loadChatById(this.channelId);
    // if (changes['chatId'] || changes['channelId']) {
    //   if (this.chatId && this.channelId) {
    //     // console.log('ngOnChanges neue chatId', this.chatId);
    //     // console.log('ngOnChanges neue channelId', this.channelId);
    //     // console.log('ngOnChanges currentUserId', this.currentUserId);
    //     this.chat$ = this.getChatObservable();
    //     this.getAnswersForChat();
    //   }
    // }
  }

  scrollToBottom() {
    const chatHistory = document.getElementById('chat-history');
    if (chatHistory) {
      chatHistory.scrollTop = chatHistory.scrollHeight;
    }
  }

  getCurrentUser() {
    this.userService.getCurrentUser().pipe(take(1)).subscribe(user => {
      // console.log(user);
      if (user) {
        this.currentUserId = user.uid;
        // console.log('getCurrentUser', this.currentUserId);
      }
    });
  }

  // loadChannel() {
  //   if (!this.channelId) {
  //     console.log(this.channelId);
  //     // this.loadFirstChannel();
  //     // this.loadFirstChatWithAnswers();
  //   } else {
  //     this.loadChannelWithId(this.channelId);
  //     this.loadChatById(this.channelId);
  //   }
  // }

  // private async loadFirstChannel() {
  //   this.channelService.getChannels().pipe(take(1)).subscribe(async channels => {
  //     if (channels.length > 0) {
  //       const firstChannel = channels[0];
  //       // this.channelId = firstChannel.id;
  //       this.channelName$ = of(firstChannel.name);
  //       // const channelName = await firstValueFrom(this.channelName$);
  //       // console.log('Channel Name:', channelName);
  //       // this.participants$ = this.userService.getUsersByIds(firstChannel.participants);
  //       this.subscribeToParticipants();
  //       // this.subscribeToChatsAndUsers(this.channelId, this.participants$);
  //     // } else {
  //     }
  //   });
  // }

  private loadChannelWithId(channelId: string) {
    // console.log('loadChannelWithId channelId', channelId);

    this.channelService.getChannelById(channelId).pipe(take(1)).subscribe(channel => {
      if (!channel) return;
      // console.log('loadChannelWithId channel participants', channel.participants);
      this.channelId = channelId;
      this.channelName$ = of(channel.name);
      this.participants$ = this.userService.getUsersByIds(channel.participants);
      this.subscribeToParticipants();
      this.subscribeToChatsAndUsers(channelId, this.participants$);
    });
  }

  getEnrichedChat(): Observable<Chat | undefined> {
    return this.channelService.getChatsForChannel(this.channelId).pipe(
      switchMap(chats =>
        this.userService.getUsersByIds(chats.map(c => c.user)).pipe(
          map(users => {
            const chat = chats.find(c => c.id === this.chatId);
            if (!chat) return undefined;
            const user = users.find(u => u.uid === chat.user);
            // chat.reactions wird erwartet als Map: { reactionType: [userId, ...] } oder { reactionType: userId }
            return {
              ...chat,
              userName: user?.name,
              userImg: user?.img,
              reactionArray: this.transformReactionsToArray(chat.reactions, users, this.currentUserId)
            };
          })
        )
      )
    );
  }

  getEnrichedAnswers(): Observable<Answer[]> {
    return this.channelService.getAnswersForChat(this.channelId, this.chatId).pipe(
      switchMap(answers =>
        answers.length
          ? this.userService.getUsersByIds(answers.map(a => a.user)).pipe(
              map(users =>
                answers.map(answer => ({
                  ...answer,
                  userName: users.find(u => u.uid === answer.user)?.name,
                  userImg: users.find(u => u.uid === answer.user)?.img,
                  // answer.reactions direkt als Map
                  reactionArray: this.transformReactionsToArray(answer.reactions, users, this.currentUserId)
                }))
              )
            )
          : of([])
      )
    );
  }

  async loadChatById(channelId: string) {
    this.channelService.getChannelById(channelId).pipe(take(1)).subscribe(async channel => {
      if (!channel) return;

      this.channelId = channelId;
      this.channelName$ = of(channel.name);
      // const channelName = await firstValueFrom(this.channelName$);
      // console.log('Channel Name:', channelName);
      // this.participants$ = this.userService.getUsersByIds(channel.participants);
      this.subscribeToParticipants();
      // this.subscribeToChatsAndUsers(channelId, this.participants$);
    });
  }

  subscribeToParticipants() {
    this.participants$.subscribe(users => {
      this.participants = users;
      // console.log('participants', this.participants)
    });
  }

  private subscribeToChatsAndUsers(channelId: string, participants$: Observable<User[]>) {
    combineLatest([
      this.channelService.getChatsForChannel(channelId),
      participants$
    ]).pipe(
      switchMap(([chats, users]) => {
        if (!chats.length || !users.length) return of([]);
        const chatDetailsObservables = chats.map(chat => this.enrichChat(channelId, chat, users));
        return forkJoin(chatDetailsObservables);
      }),
      map((enrichedChats: ChatWithDetails[]) => enrichedChats.sort((a, b) => a.time - b.time))
    ).subscribe(sortedChats => {
      this.chatsSubject.next(sortedChats);
      setTimeout(() => this.scrollToBottom());
    });
  }
  private subscribeToThreadAndUsers(channelId: string, participants$: Observable<User[]>) {
    combineLatest([
      this.channelService.getChatsForChannel(channelId),
      participants$
    ]).pipe(
      switchMap(([chats, users]) => {
        if (!chats.length || !users.length) return of([]);
        const chatDetailsObservables = chats.map(chat => this.enrichThread(channelId, chat, users));
        return forkJoin(chatDetailsObservables);
      }),
      map((enrichedAnswers: ChatWithDetails[]) => enrichedAnswers.sort((a, b) => a.time - b.time))
    ).subscribe(sortedAnswers => {
      this.chatsSubject.next(sortedAnswers);
      setTimeout(() => this.scrollToBottom());
    });
  }


  private enrichChat(channelId: string, chat: Chat, users: User[]): Observable<any> {
    return forkJoin({
      reactions: this.channelService.getReactionsForChat(channelId, chat.id).pipe(take(1),
        // catchError(err => { console.error('[enrichChat] Fehler bei getReactionsForChat', err); return of({}); })
      ),
      user: of(users.find(u => u.uid === chat.user)),
      answers: this.channelService.getAnswersForChat(channelId, chat.id).pipe(take(1),
        // catchError(err => { console.error('[enrichChat] Fehler bei getAnswersForChat', err); return of([]); })
      )
    }).pipe(
      map(({ reactions, user, answers }) => {
        const result = {
          ...chat,
          userName: user?.name,
          userImg: user?.img,
          answersCount: answers.length,
          lastAnswerTime: answers.length > 0 ? answers[answers.length - 1].time : null,
          reactions,
          reactionArray: this.transformReactionsToArray(reactions, users, this.currentUserId)
        };
        // console.log('[enrichChat] Angereicherter Chat:', result); // Einzel-Chat loggen
        return result;
      })
    );
  }
  private enrichThread(channelId: string, chat: Chat, users: User[]): Observable<any> {
    return forkJoin({
      reactions: this.channelService.getReactionsForChat(channelId, chat.id).pipe(take(1),
        // catchError(err => { console.error('[enrichChat] Fehler bei getReactionsForChat', err); return of({}); })
      ),
      user: of(users.find(u => u.uid === chat.user)),
      answers: this.channelService.getAnswersForChat(channelId, chat.id).pipe(take(1),
        // catchError(err => { console.error('[enrichChat] Fehler bei getAnswersForChat', err); return of([]); })
      )
    }).pipe(
      map(({ reactions, user, answers }) => {
        const result = {
          ...chat,
          userName: user?.name,
          userImg: user?.img,
          answersCount: answers.length,
          lastAnswerTime: answers.length > 0 ? answers[answers.length - 1].time : null,
          reactions,
          reactionArray: this.transformReactionsToArray(reactions, users, this.currentUserId)
        };
        // console.log('[enrichChat] Angereicherter Chat:', result); // Einzel-Chat loggen
        return result;
      })
    );
  }


  getChatObservable(): Observable<Chat | undefined> {
    return combineLatest([
      this.channelService.getChatsForChannel(this.channelId),
      of(this.participants)
    ]).pipe(
      map(([chats, participants]) => chats.find(c => c.id === this.chatId)),
      switchMap(chat => {
        if (!chat) return of(undefined);
        return forkJoin({
          reactions: this.channelService.getReactionsForChat(this.channelId, chat.id).pipe(take(1)),
          user: of(this.participants.find(u => u.uid === chat.user)),
        }).pipe(
          map(({ reactions, user }) => ({
            ...chat,
            userName: user?.name,
            userImg: user?.img,
            reactions,
            reactionArray: this.transformReactionsToArray(reactions, this.participants, this.currentUserId)
          }))
        );
      })
    );
  }

  getAnswersForChat() {
    // Answers aus der Subcollection
    this.answers$ = this.channelService.getAnswersForChat(this.channelId, this.chatId).pipe(
      switchMap(answers =>
        this.userService.getUsersByIds(answers.map((a: any) => a.user)).pipe(
          switchMap(users => {
            const answerDetails$ = answers.map(answer =>
              forkJoin({
                reactions: this.channelService.getReactionsForAnswer(this.channelId, this.chatId, answer.id).pipe(take(1)),
                user: of(users.find(u => u.uid === answer.user)),
              }).pipe(
                map(({ reactions, user }) => ({
                  ...answer,
                  userName: user?.name,
                  userImg: user?.img,
                  reactions,
                  reactionArray: this.transformReactionsToArray(reactions, users, this.currentUserId)
                }))
              )
            );
            return forkJoin(answerDetails$);
          })
        )
      )
    );
    this.answers$.pipe(take(1)).subscribe(answers => {
      console.log('Chats:', answers);
    });
  }
  // getAnswersForThread(): Observable<AnswerWithDetails[]> {
  //   return this.channelService.getAnswersForChat(this.channelId, this.chatId).pipe(
  //     switchMap((answers: Answer[]) =>
  //       this.userService.getUsersByIds(answers.map(a => a.user)).pipe(
  //         switchMap(users =>
  //           answers.length
  //             ? forkJoin(
  //                 answers.map(answer =>
  //                   forkJoin({
  //                     reactions: this.channelService.getReactionsForAnswer(this.channelId, this.chatId, answer.id).pipe(take(1)),
  //                     user: of(users.find(u => u.uid === answer.user))
  //                   }).pipe(
  //                     map(({ reactions, user }) => ({
  //                       ...answer,
  //                       userName: user?.name,
  //                       userImg: user?.img,
  //                       reactions,
  //                       reactionArray: this.transformReactionsToArray(reactions, users, this.currentUserId)
  //                     }))
  //                   )
  //                 )
  //               )
  //             : of([])
  //         )
  //       )
  //     )
  //   );
  // }

  // openReactionsDialogue(chatIndex: number) {
  //   if (this.activeReactionDialogueIndex === chatIndex) {
  //     this.activeReactionDialogueIndex = null; // schließe, wenn bereits offen
  //   } else {
  //     this.editCommentDialogueExpanded = false;
  //     this.activeReactionDialogueIndex = chatIndex; // öffne aktuellen
  //   }
  // }
  openReactionsDialogue(chatId: string) {
    if (this.activeReactionDialogueIndex === chatId) {
      this.activeReactionDialogueIndex = null;
    } else {
      this.editCommentDialogueExpanded = false;
      this.activeReactionDialogueIndex = chatId;
      this.activeReactionDialogueBelowIndex = null;
    }
  }

  openReactionsDialogueBelow(chatId: string) {
    if (this.activeReactionDialogueBelowIndex === chatId) {
      this.activeReactionDialogueBelowIndex = null; // schließe, wenn bereits offen
    } else {
      this.editCommentDialogueExpanded = false;
      this.activeReactionDialogueBelowIndex = chatId; // öffne aktuellen
      this.activeReactionDialogueIndex = null;
    }
  }

  // transformReactionsToArray(
  //   reactionsMap: Record<string, string[]>,
  //   participants: User[],
  //   currentUserId: string
  // ): {
  //   type: string,
  //   count: number,
  //   userIds: string[],
  //   currentUserReacted: boolean,
  //   otherUserName?: string,
  //   otherUserReacted: boolean
  // }[] {
  //   if (!reactionsMap) return [];
  //   // console.log('transformToArray', reactionsMap, data);
  //   return Object.entries(reactionsMap).map(([type, usersRaw]) =>
  //     this.buildReactionObject(type, usersRaw, participants, currentUserId)
  //   );
  // }
  transformReactionsToArray(
    reactionsMap: Record<string, string[] | string> | undefined,
    participants: User[],
    currentUserId: string
  ): {
    type: string,
    count: number,
    userIds: string[],
    currentUserReacted: boolean,
    otherUserName?: string,
    otherUserReacted: boolean
  }[] {
    if (!reactionsMap) return [];
    return Object.entries(reactionsMap).map(([type, usersRaw]) => {
      // Fallback: falls single userId als String, dann Array draus machen
      let userIds: string[] = [];
      if (Array.isArray(usersRaw)) userIds = usersRaw;
      else if (typeof usersRaw === 'string') userIds = [usersRaw];
      else userIds = [];
      const currentUserReacted = userIds.includes(currentUserId);
      const otherUserName = this.findOtherUserName(userIds, currentUserId, participants);
      const otherUserReacted = userIds.filter(id => id !== currentUserId).length > 1;
      return { type, count: userIds.length, userIds, currentUserReacted, otherUserName, otherUserReacted };
    });
  }

  private buildReactionObject(
    type: string,
    usersRaw: string[],
    participants: User[],
    currentUserId: string
  ): {
    type: string,
    count: number,
    userIds: string[],
    currentUserReacted: boolean,
    otherUserName?: string,
    otherUserReacted: boolean
  } {
    const userIds = this.parseUserIds(usersRaw);
    const currentUserReacted = userIds.includes(currentUserId);
    const otherUserName = this.findOtherUserName(userIds, currentUserId, participants);
    const otherUserReacted = userIds.filter(id => id !== currentUserId).length > 1;

    return {
      type,
      count: userIds.length,
      userIds,
      currentUserReacted,
      otherUserName,
      otherUserReacted
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

  private async saveOrDeleteReaction(channelId: string, chatId: string, reactionType: string, updatedUsers: string[]): Promise<void> {
    if (updatedUsers.length === 0) {
      await this.channelService.deleteReactionForChat(channelId, chatId, reactionType);
    } else {
      await this.channelService.updateReactionForChat(channelId, chatId, reactionType, updatedUsers);
    }
  }

  // private async updateReactionForChat(chatIndex: number, reactionType: string, updatedUsers: string[]): Promise<void> {
  //   // Hier hole den aktuellen State vom BehaviorSubject (nicht von channelChats)
  //   const chats = this.chatsSubject.getValue();
  //   const chat = chats[chatIndex];
  //   if (!chat) return;

  //   const channelId = this.channelId;
  //   const chatId = chat.id;
  //   const currentUserId = this.currentUserId;
  //   if (!channelId || !chatId || !currentUserId) return;

  //   try {
  //     await this.saveOrDeleteReaction(channelId, chatId, reactionType, updatedUsers);
  //     this.updateLocalReaction(chat, reactionType, updatedUsers, chatIndex);
  //   } catch (error) {
  //     console.error('Fehler beim Aktualisieren der Reaction:', error);
  //   }
  // }
  private async updateReactionForChat(chatId: string, reactionType: string, updatedUsers: string[]): Promise<void> {
    // Hole den aktuellen Chat direkt über das Observable (du hast nur einen Chat im Thread)
    const chat = await firstValueFrom(this.chat$);
    if (!chat) return;

    const channelId = this.channelId;
    const currentUserId = this.currentUserId;
    if (!channelId || !chatId || !currentUserId) return;

    try {
      await this.saveOrDeleteReaction(channelId, chatId, reactionType, updatedUsers);
      this.updateLocalReaction(chat, reactionType, updatedUsers);
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Reaction:', error);
    }
  }

  // private updateLocalReaction(chat: any, reactionType: string, updatedUsers: string[], chatIndex: number) {
  //   chat.reactions = { ...chat.reactions };
  //   if (updatedUsers.length === 0) {
  //     delete chat.reactions[reactionType];
  //   } else {
  //     chat.reactions[reactionType] = updatedUsers;
  //   }
  //   chat.reactionArray = this.transformReactionsToArray(chat.reactions, this.participants, this.currentUserId);

  //   // Aktualisiere den BehaviorSubject State mit neuem Chat Objekt
  //   const chats = this.chatsSubject.getValue();
  //   const newChats = [...chats];
  //   newChats[chatIndex] = chat;  // Ersetze den Chat an Index
  //   this.chatsSubject.next(newChats); 
  // }
  private updateLocalReaction(chat: any, reactionType: string, updatedUsers: string[]): void {
    chat.reactions = { ...chat.reactions };
    if (updatedUsers.length === 0) {
      delete chat.reactions[reactionType];
    } else {
      chat.reactions[reactionType] = updatedUsers;
    }
    chat.reactionArray = this.transformReactionsToArray(chat.reactions, this.participants, this.currentUserId);

    // Für einen einzelnen Chat reicht es, das Observable neu zu setzen (optional: Subject, falls weitere lokale Updates nötig sind)
    this.chat$ = of({ ...chat });
  }

  async addReaction(chatId: string, reactionType: string) {
    // const chats = this.chatsSubject.getValue();
    // const chat = chats[chatIndex];
    const chat = await firstValueFrom(this.chat$);
    if (!chat) return;

    this.activeReactionDialogueIndex = null;
    this.activeReactionDialogueBelowIndex = null;
    const currentReactionUsers = this.extractUserIds(chat.reactions || {}, reactionType);
    if (!currentReactionUsers.includes(this.currentUserId)) {
      const updatedUsers = [...currentReactionUsers, this.currentUserId];
      await this.saveOrDeleteReaction(this.channelId, chatId, reactionType, updatedUsers);
      await this.updateReactionForChat(chatId, reactionType, updatedUsers);
    }
  }

  async toggleReactionForChat(chatId: string, reactionType: string) {
    // const chat = await this.getChatByIndex(chatIndex);
    const chat = await firstValueFrom(this.chat$);
    if (!chat) return;

    const currentReactionUsers = this.extractUserIds(chat.reactions || {}, reactionType);
    let updatedUsers: string[];
    if (currentReactionUsers.includes(this.currentUserId)) {
      updatedUsers = currentReactionUsers.filter(uid => uid !== this.currentUserId);
    } else {
      updatedUsers = [...currentReactionUsers, this.currentUserId];
    }

    await this.saveOrDeleteReaction(this.channelId, chatId, reactionType, updatedUsers);
    await this.updateReactionForChat(chatId, reactionType, updatedUsers);
  }
  async toggleReactionForAnswer(answerId: string, reactionType: string) {
    // const chat = await firstValueFrom(this.chat$);
    // if (!chat) return;

    // const currentReactionUsers = this.extractUserIds(chat.reactions || {}, reactionType);
    // let updatedUsers: string[];
    // if (currentReactionUsers.includes(this.currentUserId)) {
    //   updatedUsers = currentReactionUsers.filter(uid => uid !== this.currentUserId);
    // } else {
    //   updatedUsers = [...currentReactionUsers, this.currentUserId];
    // }

    // await this.saveOrDeleteReaction(this.channelId, answerId, reactionType, updatedUsers);
    // await this.updateReactionForChat(answerId, reactionType, updatedUsers);
  }

  private extractUserIds(reactions: Record<string, any>, reactionType: string): string[] {
    const usersRaw = reactions[reactionType] || [];
    return usersRaw.flatMap((u: string) =>
      u.includes(',') ? u.split(',').map((x: string) => x.trim()) : [u]
    );
  }

  // Hilfsmethode, um den Chat aus Observable oder Cache zu erhalten
  private async getChatByIndex(chatIndex: number): Promise<any> {
    if (this.channelChats && this.channelChats.length > chatIndex) {
      return this.channelChats[chatIndex];
    }
    // Alternativ Chats aus Observable abrufen, dann Wert zurückgeben
    return new Promise(resolve => {
      this.chats$.pipe(take(1)).subscribe((chats: any) => resolve(chats[chatIndex]));
    })
  }

  handleCloseThread() {
    this.closeThread.emit();
  }

  openEditCommentDialogue() {
    this.editCommentDialogueExpanded = !this.editCommentDialogueExpanded;
  }
}