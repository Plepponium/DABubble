import { Component, Output, EventEmitter, Input, inject, OnInit, SimpleChanges, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { RoundBtnComponent } from '../round-btn/round-btn.component';
import { BehaviorSubject, combineLatest, filter, firstValueFrom, forkJoin, map, Observable, of, switchMap, take, takeUntil } from 'rxjs';
import { ChannelService } from '../../services/channel.service';
import { UserService } from '../../services/user.service';
import { User } from '../../models/user.class';
import { Chat } from '../../models/chat.class';
import { ChatWithDetails } from '../../models/chat-with-details.class';
import { Answer } from '../../models/answer.class';
import { reactionIcons } from '../reaction-icons';
import { MentionsOverlayComponent } from '../shared/mentions-overlay/mentions-overlay.component';
import { SmileyOverlayComponent } from "../shared/smiley-overlay/smiley-overlay.component";
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { RawReactionsMap, TransformedReaction } from '../../models/reaction.types';
import { LogoutService } from '../../services/logout.service';
import { ChatInputComponent } from "../chat-input/chat-input.component";
import { ChatsUiService } from '../../services/chats-ui.service';
import { ThreadService } from '../../services/thread.service';

@Component({
  selector: 'app-thread',
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatIconModule, MatButtonModule, RoundBtnComponent, MentionsOverlayComponent, SmileyOverlayComponent, ChatInputComponent],
  templateUrl: './thread.component.html',
  styleUrl: './thread.component.scss'
})
export class ThreadComponent implements OnInit {

  @ViewChild('answerInput', { static: false }) answerInput!: ElementRef<HTMLTextAreaElement>;
  channelService = inject(ChannelService);
  userService = inject(UserService);
  logoutService = inject(LogoutService);
  uiService = inject(ChatsUiService);
  threadService = inject(ThreadService);

  overlayActive: boolean = false;
  editAnswerEditIndex: number | null = null;
  activeReactionDialogueIndex: string | null = null;
  activeReactionDialogueBelowIndex: string | null = null;
  activeReactionDialogueAnswersIndex: number | null = null;
  activeReactionDialogueBelowAnswersIndex: number | null = null;
  insertedAtPending = false;
  isResponsive = false;
  private isSubmitting = false;

  currentUserId: string = '';
  participantIds: string[] = [];
  participants: User[] = [];
  filteredChannels: any[] = [];
  // channelChats: any[] = [];
  reactionIcons = reactionIcons;
  reactionArray: { type: string, count: number, user: string[] }[] = [];
  newAnswer: string = '';
  mentionCaretIndex: number | null = null;
  cursorPos: number = 0;
  showAllReactionsForChat: { [chatId: string]: boolean } = {};
  showAllReactionsForAnswer: { [answerId: string]: boolean } = {};

  channelName$: Observable<string> = of('');
  participants$: Observable<User[]> = of([]);
  chat$!: Observable<Chat | undefined>;
  answers$!: Observable<Answer[]>;

  private chatsSubject = new BehaviorSubject<ChatWithDetails[]>([]);
  public chats$ = this.chatsSubject.asObservable();
  private destroy$ = this.logoutService.logout$;

  activeSmiley = false;
  allSmileys = reactionIcons;

  @Input() channelId!: string;
  @Input() chatId!: string;
  @Output() closeThread = new EventEmitter<void>();
  @Output() openProfile = new EventEmitter<User>();
  @Output() answerAdded = new EventEmitter<{ chatId: string, answerTime: number }>();

  constructor(private sanitizer: DomSanitizer) { }

  ngOnInit() {
    this.updateIsResponsive();
    this.getCurrentUserAndChannels();
    this.loadChannelWithId(this.channelId);
    // this.threadService.loadChannelWithId(this.channelId).subscribe(({ channelName$, participants$ }) => {
    //   this.channelName$ = channelName$;
    //   this.participants$ = participants$;
      
    //   this.participants$.subscribe(users => this.participants = users);
      
    //   this.chat$ = this.threadService.getEnrichedChat(this.channelId, this.chatId, this.participants$, this.currentUserId);
    //   this.answers$ = this.threadService.getEnrichedAnswers(this.channelId, this.chatId, this.participants$, this.currentUserId);
    // });
    // this.chat$ = this.getEnrichedChat();
    // this.answers$ = this.getEnrichedAnswers();
    // this.answers$.pipe(take(1), takeUntil(this.destroy$)).subscribe(() => {
    //   this.scrollToBottom();
    //   this.focusAnswerInput()
    // });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['chatId'] && !changes['chatId'].firstChange) {
      // this.chat$ = this.getEnrichedChat();
      // this.answers$ = this.getEnrichedAnswers();
      this.chat$ = this.threadService.getEnrichedChat(this.channelId, this.chatId, this.participants$, this.currentUserId);
      this.answers$ = this.threadService.getEnrichedAnswers(this.channelId, this.chatId, this.participants$, this.currentUserId);
      
      this.answers$.pipe(take(1), takeUntil(this.destroy$)).subscribe(() => {
        this.scrollToBottom();
        this.focusAnswerInput();
      });
    }
    if (changes['channelId'] && !changes['channelId'].firstChange) {
      this.getCurrentUserAndChannels();
      this.loadChannelWithId(this.channelId);
      // this.threadService.loadChannelWithId(this.channelId).subscribe(({ channelName$, participants$ }) => {
      //   this.channelName$ = channelName$;
      //   this.participants$ = participants$;

      //   this.subscribeToParticipants();

      //   this.chat$ = this.threadService.getEnrichedChat(
      //     this.channelId, this.chatId, this.participants$, this.currentUserId
      //   );
      //   this.answers$ = this.threadService.getEnrichedAnswers(
      //     this.channelId,
      //     this.chatId,
      //     this.participants$,
      //     this.currentUserId
      //   );

        // this.answers$.pipe(take(1), takeUntil(this.destroy$)).subscribe(() => {
        //   this.scrollToBottom();
        //   this.focusAnswerInput();
        // });
      // });
    }
  }

  @HostListener('window:resize') 
  onResize() {
    this.updateIsResponsive();
  }

  updateIsResponsive() { 
    this.isResponsive = window.innerWidth < 881;
  }

  focusInput(event: MouseEvent) {
    if (event.target === this.answerInput?.nativeElement ||
      event.target instanceof HTMLElement &&
      event.target.closest('.input-icon-bar')) {
      return;
    }

    this.answerInput?.nativeElement?.focus();
  }

  focusAnswerInput() {
    setTimeout(() => {
      this.answerInput?.nativeElement?.focus();
    }, 0);
  }

  scrollToBottom() {
    setTimeout(() => {
      const threadHistory = document.getElementById('thread-history');
      if (threadHistory) {
        threadHistory.scrollTop = threadHistory.scrollHeight;
      }
    }, 100); 
  }

  scrollToBottomNewMessage() {
    const threadHistory = document.getElementById('thread-history');
    threadHistory?.scrollTo({ top: threadHistory.scrollHeight, behavior: 'smooth' });
  }

  getCurrentUserAndChannels() {
  //   this.userService.getCurrentUser().pipe(take(1), takeUntil(this.destroy$)).subscribe(user => {
  //     if (user) {
  //       this.currentUserId = user.uid;
  //       this.channelService.getChannels().pipe(take(1), takeUntil(this.destroy$)).subscribe(channels => {
  //         this.filteredChannels = channels.filter(c =>
  //           Array.isArray(c.participants) && c.participants.includes(this.currentUserId)
  //         );
  //       });
  //     }
  //   });
    this.threadService.getCurrentUserAndChannels().subscribe(result => {
      this.currentUserId = result.userId;
      this.filteredChannels = result.channels;
    });
  }

  private loadChannelWithId(channelId: string) {
  //   this.channelService.getChannelById(channelId).pipe(take(1), takeUntil(this.destroy$)).subscribe(channel => {
  //     if (!channel) return;
  //     this.channelId = channelId;
  //     this.channelName$ = of(channel.name);
  //     this.participants$ = this.userService.getUsersByIds(channel.participants);
  //     this.subscribeToParticipants();
  //   });
    this.threadService.loadChannelWithId(this.channelId).subscribe(({ channelName$, participants$ }) => {
      this.channelName$ = channelName$;
      this.participants$ = participants$;

      this.subscribeToParticipants();

      this.chat$ = this.threadService.getEnrichedChat(this.channelId, this.chatId, this.participants$, this.currentUserId);
      this.answers$ = this.threadService.getEnrichedAnswers(this.channelId, this.chatId, this.participants$, this.currentUserId);
      
      this.answers$.pipe(take(1), takeUntil(this.destroy$)).subscribe(() => {
        this.scrollToBottom();
        this.focusAnswerInput();
      });
    });
  }

  // getEnrichedChat(): Observable<Chat | undefined> {
  //   return this.channelService.getChatsForChannel(this.channelId).pipe(
  //     switchMap(chats =>
  //       this.participants$.pipe(
  //         map(users => {
  //           const chat = chats.find(c => c.id === this.chatId);
  //           if (!chat) return undefined;
  //           const user = users.find(u => u.uid === chat.user);
  //           const isUserMissing = !user;
  //           return {
  //             ...chat,
  //             userName: isUserMissing ? 'Ehemaliger Nutzer' : user.name,
  //             userImg: user?.img ?? 'default-user',
  //             isUserMissing,
  //             reactionArray: this.transformReactionsToArray(chat.reactions, users, this.currentUserId)
  //           };
  //         })
  //       )
  //     )
  //   );
  // }

  // getEnrichedAnswers(): Observable<Answer[]> {
  //   return this.channelService.getAnswersForChat(this.channelId, this.chatId).pipe(
  //     switchMap(answers =>
  //       this.participants$.pipe(
  //         map(users =>
  //           answers.map(answer => {
  //             const user = users.find(u => u.uid === answer.user);
  //             const isUserMissing = !user;

  //             return {
  //               ...answer,
  //               userName: isUserMissing ? 'Ehemaliger Nutzer' : user.name,
  //               userImg: user?.img ?? 'default-user',
  //               isUserMissing,
  //               reactionArray: this.transformReactionsToArray(answer.reactions, users, this.currentUserId)
  //             };
  //           })
  //         )
  //       )
  //     )
  //   );
  // }

  // async loadChatById(channelId: string) {
  // //   this.channelService.getChannelById(channelId).pipe(take(1), takeUntil(this.destroy$)).subscribe(async channel => {
  // //     if (!channel) return;

  // //     this.channelId = channelId;
  // //     this.channelName$ = of(channel.name);
  // //     this.subscribeToParticipants();
  // //   });
  //   this.threadService.loadChatById(this.channelId).subscribe(({ name$, participants$ }) => {
  //     this.channelName$ = name$;
  //     this.participants$ = participants$;

  //     this.participants$.subscribe(users => (this.participants = users));

  //     // Danach kannst du z. B. direkt Chat/Answers laden
  //     this.chat$ = this.threadService.getEnrichedChat(
  //       this.channelId,
  //       this.chatId,
  //       this.participants$,
  //       this.currentUserId
  //     );
  //     this.answers$ = this.threadService.getEnrichedAnswers(
  //       this.channelId,
  //       this.chatId,
  //       this.participants$,
  //       this.currentUserId
  //     );
  //   });
  // }

  subscribeToParticipants() {
    this.participants$.pipe(takeUntil(this.destroy$)).subscribe(users => {
      this.participants = users;
      // console.log('participants', this.participants)
    });
  }

  // getAnswersForChat() {
  // //   this.answers$ = this.channelService.getAnswersForChat(this.channelId, this.chatId).pipe(
  // //     switchMap(answers =>
  // //       this.userService.getUsersByIds(answers.map((a: any) => a.user)).pipe(
  // //         switchMap(users => {
  // //           const answerDetails$ = answers.map(answer =>
  // //             forkJoin({
  // //               reactions: this.channelService.getReactionsForAnswer(this.channelId, this.chatId, answer.id).pipe(take(1)),
  // //               user: of(users.find(u => u.uid === answer.user)),
  // //             }).pipe(
  // //               map(({ reactions, user }) => ({
  // //                 ...answer,
  // //                 userName: user?.name,
  // //                 userImg: user?.img,
  // //                 reactions,
  // //                 reactionArray: this.transformReactionsToArray(reactions, users, this.currentUserId)
  // //               }))
  // //             )
  // //           );
  // //           return forkJoin(answerDetails$);
  // //         })
  // //       )
  // //     )
  // //   );
  // //   map((enrichedAnswers: Answer[]) =>
  // //     enrichedAnswers.sort((a, b) => a.time - b.time)
  // //   );
  //   this.answers$ = this.threadService.getAnswersForChat(
  //     this.channelId,
  //     this.chatId,
  //     this.currentUserId,
  //     this.userService,
  //     this.channelService
  //   );
  // }

  openReactionsDialogue(chatId: string) {
    if (this.activeReactionDialogueIndex === chatId) {
      this.activeReactionDialogueIndex = null;
    } else {
      this.editAnswerEditIndex = null;
      this.activeReactionDialogueIndex = chatId;
      this.activeReactionDialogueBelowIndex = null;
    }
  }

  openReactionsDialogueAnswers(i: number) {
    if (this.activeReactionDialogueAnswersIndex === i) {
      this.activeReactionDialogueAnswersIndex = null;
    } else {
      this.editAnswerEditIndex = null;
      this.activeReactionDialogueAnswersIndex = i;
      this.activeReactionDialogueBelowAnswersIndex = null;
    }
  }

  openReactionsDialogueBelow(chatId: string) {
    if (this.activeReactionDialogueBelowIndex === chatId) {
      this.activeReactionDialogueBelowIndex = null;
    } else {
      this.editAnswerEditIndex = null;
      this.activeReactionDialogueBelowIndex = chatId;
      this.activeReactionDialogueIndex = null;
    }
  }

  openReactionsDialogueBelowAnswers(i: number) {
    if (this.activeReactionDialogueBelowAnswersIndex === i) {
      this.activeReactionDialogueBelowAnswersIndex = null;
    } else {
      this.editAnswerEditIndex = null;
      this.activeReactionDialogueBelowAnswersIndex = i;
      this.activeReactionDialogueAnswersIndex = null;
    }
  }

  // transformReactionsToArray(
  //   reactionsMap: RawReactionsMap | undefined,
  //   participants: User[],
  //   currentUserId: string
  // ): TransformedReaction[] {
  //   if (!reactionsMap) return [];

  //   return Object.entries(reactionsMap).map(([type, usersRaw]) => {
  //       const userIds = this.parseUserIds(Array.isArray(usersRaw) ? usersRaw : [usersRaw]);
  //       const currentUserReacted = userIds.includes(currentUserId);
  //       const otherUserName = this.findOtherUserName(userIds, currentUserId, participants);
  //       const otherUserReacted = userIds.filter(id => id !== currentUserId).length > 1;

  //       return {
  //         type,
  //         count: userIds.length,
  //         userIds,
  //         currentUserReacted,
  //         otherUserName,
  //         otherUserReacted,
  //       };
  //     })
  //     .sort((a, b) => a.type.localeCompare(b.type));
  // }

  // private parseUserIds(users: string[]): string[] {
  //   return users.flatMap(u =>
  //     u.includes(',') ? u.split(',').map(id => id.trim()) : [u]
  //   );
  // }

  // private findOtherUserName(userIds: string[], currentUserId: string, participants: User[]): string | undefined {
  //   const others = userIds.filter(id => id !== currentUserId);
  //   if (others.length === 0) return undefined;
  //   return participants.find(u => u.uid === others[0])?.name || 'Unbekannt';
  // }

  // private async saveOrDeleteReaction(channelId: string, chatId: string, reactionType: string, updatedUsers: string[]): Promise<void> {
  //   if (updatedUsers.length === 0) {
  //     await this.channelService.deleteReactionForChat(channelId, chatId, reactionType);
  //   } else {
  //     await this.channelService.updateReactionForChat(channelId, chatId, reactionType, updatedUsers);
  //   }
  // }
  // private async saveOrDeleteReaction(channelId: string, chatId: string, reactionType: string, updatedUsers: string[]): Promise<void> {
  //   // Methode passt sich an die Map-Struktur an und ruft setReaction auf
  //   await this.channelService.setReaction(channelId, chatId, reactionType, updatedUsers);
  // }

  // private async updateReactionForChat(chatId: string, reactionType: string, updatedUsers: string[]): Promise<void> {
  //   // Hole den aktuellen Chat direkt über das Observable (du hast nur einen Chat im Thread)
  //   const chat = await firstValueFrom(this.chat$);
  //   if (!chat) return;

  //   const channelId = this.channelId;
  //   const currentUserId = this.currentUserId;
  //   if (!channelId || !chatId || !currentUserId) return;

  //   try {
  //     // await this.saveOrDeleteReaction(channelId, chatId, reactionType, updatedUsers);
  //     this.updateLocalReaction(chat, reactionType, updatedUsers);
  //   } catch (error) {
  //     console.error('Fehler beim Aktualisieren der Reaction:', error);
  //   }
  // }

  // private updateLocalReaction(chat: any, reactionType: string, updatedUsers: string[]): void {
  //   chat.reactions = { ...chat.reactions };
  //   if (updatedUsers.length === 0) {
  //     delete chat.reactions[reactionType];
  //   } else {
  //     chat.reactions[reactionType] = updatedUsers;
  //   }
  //   chat.reactionArray = this.transformReactionsToArray(chat.reactions, this.participants, this.currentUserId);

  //   // Für einen einzelnen Chat reicht es, das Observable neu zu setzen (optional: Subject, falls weitere lokale Updates nötig sind)
  //   this.chat$ = of({ ...chat });
  // }

  // async addReaction(chatId: string, reactionType: string) {
  //   console.log('reactionType', reactionType);

  //   const chat = await firstValueFrom(this.chat$);
  //   if (!chat) return;

  //   this.activeReactionDialogueIndex = null;
  //   this.activeReactionDialogueBelowIndex = null;

  //   const currentReactionUsers = this.extractUserIds(chat.reactions || {}, reactionType);
  //   if (!currentReactionUsers.includes(this.currentUserId)) {
  //     const updatedUsers = [...currentReactionUsers, this.currentUserId];
  //     await this.saveOrDeleteReaction(this.channelId, chatId, reactionType, updatedUsers);
  //     await this.updateReactionForChat(chatId, reactionType, updatedUsers);
  //   }
  // }
  async addReaction(chatId: string, reactionType: string) {
    const updatedChat = await this.threadService.addReaction(
      this.channelId,
      this.chat$,
      reactionType,
      this.currentUserId,
      this.participants
    );

    if (updatedChat) {
      this.chat$ = of(updatedChat); // UI neu rendern
    }
  }

  async addReactionToAnswer(answerId: string, reactionType: string) {
  //   const answers = await firstValueFrom(this.answers$);
  //   const answer = answers.find(a => a.id === answerId);
  //   if (!answer) return;

  //   this.activeReactionDialogueAnswersIndex = null;
  //   this.activeReactionDialogueBelowAnswersIndex = null;

  //   const currentReactionUsers = this.extractUserIds(answer.reactions || {}, reactionType);
  //   if (!currentReactionUsers.includes(this.currentUserId)) {
  //     const updatedUsers = [...currentReactionUsers, this.currentUserId];
  //     // 4. Aktualisiere Reaction-Map in Firestore via ChannelService
  //     await this.channelService.setAnswerReaction(this.channelId, this.chatId, answerId, reactionType, updatedUsers);
  //     // 5. Lokales Update der Antwort im answers$ Observable (zwingend, damit UI synchron bleibt)
  //     answer.reactions = { ...answer.reactions, [reactionType]: updatedUsers };
  //     answer.reactionArray = this.transformReactionsToArray(answer.reactions, this.participants, this.currentUserId);

  //     // Optional: answers$ triggern, damit Template updated wird
  //     this.answers$ = of([...answers]);
  //   }
    const updatedAnswers = await this.threadService.addReactionToAnswer(
      this.channelId,
      this.chatId,
      this.answers$,
      answerId,
      reactionType,
      this.currentUserId,
      this.participants
    );

    if (updatedAnswers) {
      this.answers$ = of(updatedAnswers); // UI sofort aktualisieren
    }
  }

  async toggleReactionForChat(chatId: string, reactionType: string) {
  //   const chat = await firstValueFrom(this.chat$);
  //   if (!chat) return;

  //   const currentReactionUsers = this.extractUserIds(chat.reactions || {}, reactionType);
  //   let updatedUsers: string[];
  //   if (currentReactionUsers.includes(this.currentUserId)) {
  //     updatedUsers = currentReactionUsers.filter(uid => uid !== this.currentUserId);
  //   } else {
  //     updatedUsers = [...currentReactionUsers, this.currentUserId];
  //   }

  //   await this.saveOrDeleteReaction(this.channelId, chatId, reactionType, updatedUsers);
  //   await this.updateReactionForChat(chatId, reactionType, updatedUsers);
    const updatedChat = await this.threadService.toggleReactionForChat(
      this.channelId,
      this.chat$,
      reactionType,
      this.currentUserId,
      this.participants
    );

    if (updatedChat) this.chat$ = of(updatedChat);
  }

  async toggleReactionForAnswer(answerId: string, reactionType: string) {
  //   // console.log('toggleReactionForAnswer answerId', answerId, 'reactionType', reactionType);
  //   const answers = await firstValueFrom(this.answers$);
  //   const answer = answers.find(a => a.id === answerId);
  //   if (!answer) return;

  //   const currentReactionUsers = this.extractUserIds(answer.reactions || {}, reactionType);
  //   let updatedUsers: string[];
  //   if (currentReactionUsers.includes(this.currentUserId)) {
  //     updatedUsers = currentReactionUsers.filter(uid => uid !== this.currentUserId);
  //   } else {
  //     updatedUsers = [...currentReactionUsers, this.currentUserId];
  //   }

  //   await this.channelService.setAnswerReaction(this.channelId, this.chatId, answerId, reactionType, updatedUsers);

  //   if (updatedUsers.length === 0) {
  //     const { [reactionType]: _, ...rest } = answer.reactions!;
  //     answer.reactions = rest;
  //   } else {
  //     answer.reactions = { ...answer.reactions, [reactionType]: updatedUsers };
  //   }
  //   answer.reactionArray = this.transformReactionsToArray(answer.reactions, this.participants, this.currentUserId);

  //   this.answers$ = of([...answers]);
    const updatedAnswers = await this.threadService.toggleReactionForAnswer(
      this.channelId,
      this.chatId,
      this.answers$,
      answerId,
      reactionType,
      this.currentUserId,
      this.participants
    );

    if (updatedAnswers) {
      this.answers$ = of(updatedAnswers); // UI sofort updaten
    }
  }

  // private extractUserIds(reactions: Record<string, any>, reactionType: string): string[] {
  //   const usersRaw = reactions[reactionType] || [];
  //   return usersRaw.flatMap((u: string) =>
  //     u.includes(',') ? u.split(',').map((x: string) => x.trim()) : [u]
  //   );
  // }

  handleCloseThread() {
    this.closeThread.emit();
  }

  // async submitAnswer() {
  //   if (this.isSubmitting || !this.canSendMessage()) return;
    
  //   this.isSubmitting = true; 
  //   const answer = this.buildAnswerPayload();
  //   try {
  //     await this.channelService.addAnswerToChat(this.channelId, this.chatId, answer);
  //     this.answerAdded.emit({ chatId: this.chatId!, answerTime: answer.time });
  //     this.newAnswer = '';
  //     // setTimeout(() => this.scrollToBottom());
  //     [0, 50, 150].forEach(delay => 
  //       setTimeout(() => this.scrollToBottomNewMessage(), delay)
  //     );
  //     } catch (err) {
  //     console.error('Fehler beim Senden der Antwort:', err);
  //   } finally {
  //     this.isSubmitting = false;
  //   }
  // }
  // async submitAnswer() {
  //   if (this.isSubmitting || !this.newAnswer.trim()) return;
  //   this.isSubmitting = true;

  //   const answer = this.threadService.buildAnswerPayload(this.newAnswer, this.currentUserId);

  //   try {
  //     await this.channelService.addAnswerToChat(this.channelId, this.chatId, answer);
  //     // await this.threadService.submitAnswer(this.channelId, this.chatId, answer);
  //     this.answerAdded.emit({ chatId: this.chatId, answerTime: answer.time });
  //     this.newAnswer = '';
  //     [0, 50, 150].forEach(d => setTimeout(() => this.threadService.scrollToBottomNewMessage(), d));
  //   } finally {
  //     this.isSubmitting = false;
  //   }
  // }
  async submitAnswer() {
    if (this.isSubmitting || !this.newAnswer.trim()) return;
    this.isSubmitting = true;

    try {
      const result = await this.threadService.submitAnswer(
        this.channelId,
        this.chatId,
        this.newAnswer,
        this.currentUserId
      );

      if (result.success) {
        this.answerAdded.emit({ chatId: this.chatId, answerTime: result.answerTime! });
        this.newAnswer = '';

        [0, 50, 150].forEach(delay =>
          setTimeout(() => this.threadService.scrollToBottomNewMessage(), delay)
        );
      }
    } finally {
      this.isSubmitting = false;
    }
  }

  /** Determines whether the current message can be sent based on state and input. */
  // private canSendMessage(): boolean {
  //   if (!this.newAnswer?.trim()) return false;
  //   if (!this.channelId || !this.chatId || !this.currentUserId) return false;
  //   return true;
  // }

  /** Builds the payload object for a new chat message. */
  // private buildAnswerPayload() {
  //   return {
  //     message: this.newAnswer.trim(),
  //     time: Math.floor(Date.now() / 1000),
  //     user: this.currentUserId
  //   };
  // }

  onEnterPress(e: KeyboardEvent) {
    if (this.overlayActive) {
      e.preventDefault();
      return;
    }

    this.submitAnswer();
    e.preventDefault();
  }

  onUserNameClick(userId: string) {
    if (!userId) return;
    this.userService.getSingleUserById(userId).pipe(take(1), takeUntil(this.destroy$)).subscribe(user => {
      if (user) {
        this.openProfile.emit(user);
      }
    });
  }

  openSmileyOverlay() {
    this.activeSmiley = !this.activeSmiley;
  }

  onSmileySelected(smiley: string) {
    const textarea = this.answerInput.nativeElement;
    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    const before = this.newAnswer.slice(0, start);
    const after = this.newAnswer.slice(end);

    this.newAnswer = before + `:${smiley}:` + after;
    const caret = start + smiley.length + 2;

    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = caret;
      textarea.focus();
    });

    this.activeSmiley = false;
  }

  insertMention(event: { name: string; type: 'user' | 'channel' | 'email' }) {
    const trigger = event.type === 'user' ? '@' : '#';
    const pos = this.mentionCaretIndex ?? this.newAnswer.length;
    const before = this.newAnswer.slice(0, pos);
    const after = this.newAnswer.slice(pos);
    const replaced = before.replace(/([@#])([^\s]*)$/, `${trigger}${event.name}`);

    this.newAnswer = replaced + ' ' + after;
    this.mentionCaretIndex = replaced.length + 1;

    setTimeout(() => {
      const textarea = this.answerInput.nativeElement;
      textarea.selectionStart = textarea.selectionEnd = this.mentionCaretIndex!;
      // this.updateCaretPosition();
      textarea.focus();
    });
    this.overlayActive = false;
  }

  updateCaretPosition() {
    const textarea = this.answerInput?.nativeElement;
    if (!textarea) return;
    this.mentionCaretIndex = textarea.selectionStart ?? 0;
  }

  updateEditCaret(answer: any, textarea: HTMLTextAreaElement) {
    answer._caretIndex = textarea.selectionStart;
  }

  toggleEditMenu(answer: Answer) {
    answer.showEditMenu = !answer.showEditMenu;
  }

  enableEditAnswer(answer: Answer) {
    answer.showEditMenu = false;
    answer.isEditing = true;
    answer.editedText = answer.message;
  }

  cancelEditAnswer(answer: Answer) {
    answer.isEditing = false;
    answer.editedText = answer.message;
  }

  insertMentionInEdit(
    answer: any,
    event: { name: string; type: 'user' | 'channel' | 'email' }
  ) {
    const trigger = event.type === 'user' ? '@' : '#';
    const pos = answer._caretIndex ?? answer.editedText.length;
    const before = answer.editedText.slice(0, pos);
    const after = answer.editedText.slice(pos);
    const replaced = before.replace(/([@#])([^\s]*)$/, `${trigger}${event.name}`);
    answer.editedText = replaced + ' ' + after;
    answer._caretIndex = replaced.length + 1;
    setTimeout(() => {
      const textarea = document.getElementById(`edit-${answer.id}`) as HTMLTextAreaElement;
      if (textarea) {
        textarea.selectionStart = textarea.selectionEnd = answer._caretIndex;
        textarea.focus();
      }
    });
  }

  insertAtCursor(character: string = '@') {
    const textarea = this.answerInput.nativeElement;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = this.newAnswer.slice(0, start);
    const after = this.newAnswer.slice(end);
    this.newAnswer = before + character + after;
    this.mentionCaretIndex = start + character.length;
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = this.mentionCaretIndex!;
      textarea.focus();
    }); 0
  }

  async saveEditedAnswer(answer: Answer) {
  //   const newText = answer.editedText?.trim();
  //   if (!newText || newText === answer.message) {
  //     answer.isEditing = false;
  //     return;
  //   }
  //   await this.channelService.updateAnswerMessage(
  //     this.channelId,
  //     this.chatId,
  //     answer.id,
  //     newText
  //   );
  //   answer.message = newText;
  //   answer.isEditing = false;
    const result = await this.threadService.saveEditedAnswer(
      this.channelId,
      this.chatId,
      answer,
      answer.editedText ?? ''
    );

    if (result) {
      // Lokales Objekt in answers$ ersetzen
      const answers = await firstValueFrom(this.answers$);
      const updatedAnswers = answers.map(a => (a.id === result.id ? result : a));
      this.answers$ = of(updatedAnswers);
    }
  }

  autoGrow(el: HTMLTextAreaElement | null) {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }

  getChatDate(chat: any): Date | undefined {
    return chat.time ? new Date(chat.time * 1000) : undefined;
  }

  isSameDate(d1: Date | undefined, d2: Date | undefined): boolean {
    if (!d1 || !d2) return false;
    return d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate();
  }

  getDisplayDate(date: Date | undefined): string {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (this.isSameDate(date, today)) return 'Heute';
    if (this.isSameDate(date, yesterday)) return 'Gestern';
    return date!.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  shouldShowDateForAnswer(answers: any[], i: number, chat: any): boolean {
    if (i === 0) {
      return !this.isSameDate(this.getChatDate(chat), this.getChatDate(answers[i]));
    } else {
      return !this.isSameDate(this.getChatDate(answers[i]), this.getChatDate(answers[i - 1]));
    }
  }

  renderMessage(text: string): SafeHtml {
    if (!text) return '';

    const replaced = text.replace(/:([a-zA-Z0-9_+-]+):/g, (match, name) => {
      return `<img src="assets/reaction-icons/${name}.svg"
                  alt="${name}"
                  class="inline-smiley">`;
    });

    return this.sanitizer.bypassSecurityTrustHtml(replaced);
  }
}