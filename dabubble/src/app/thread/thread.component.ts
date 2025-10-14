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
  activeReactionDialogueAnswersIndex: number | null = null;
  activeReactionDialogueBelowAnswersIndex: number | null = null;

  currentUserId: string = '';
  participantIds: string[] = [];
  participants: User[] = [];
  channelChats: any[] = [];
  reactionIcons = reactionIcons;
  reactionArray: { type: string, count: number, user: string[] }[] = [];
  // newMessage: string = '';
  newAnswer: string = '';

  channelName$: Observable<string> = of('');
  participants$: Observable<User[]> = of([]);
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


  ngOnInit() {
    this.getCurrentUser();
    this.loadChannelWithId(this.channelId);
    this.chat$ = this.getEnrichedChat();
    this.answers$ = this.getEnrichedAnswers();
    
    // this.answers$.pipe(take(1)).subscribe(answers => {
    //   console.log('Thread Answers:', answers);
    // });
    this.answers$.pipe(take(1)).subscribe(() => {
      this.scrollToBottom();
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    this.getCurrentUser();
    this.loadChannelWithId(this.channelId);
    this.chat$ = this.getEnrichedChat();
    this.answers$ = this.getEnrichedAnswers();
  }

  scrollToBottom() {
    setTimeout(() => {
      const threadHistory = document.getElementById('thread-history');
      if (threadHistory) {
        threadHistory.scrollTop = threadHistory.scrollHeight;
      }
    }, 100); // kleiner Delay, damit DOM aktualisiert ist
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

  private loadChannelWithId(channelId: string) {
    // console.log('loadChannelWithId channelId', channelId);

    this.channelService.getChannelById(channelId).pipe(take(1)).subscribe(channel => {
      if (!channel) return;
      // console.log('loadChannelWithId channel participants', channel.participants);
      this.channelId = channelId;
      this.channelName$ = of(channel.name);
      this.participants$ = this.userService.getUsersByIds(channel.participants);
      this.subscribeToParticipants();
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
      this.subscribeToParticipants();
    });
  }

  subscribeToParticipants() {
    this.participants$.subscribe(users => {
      this.participants = users;
      // console.log('participants', this.participants)
    });
  }

  getAnswersForChat() {
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
    map((enrichedAnswers: Answer[]) =>
        enrichedAnswers.sort((a, b) => a.time - b.time)
    );
  }

  openReactionsDialogue(chatId: string) {
    if (this.activeReactionDialogueIndex === chatId) {
      this.activeReactionDialogueIndex = null;
    } else {
      this.editCommentDialogueExpanded = false;
      this.activeReactionDialogueIndex = chatId;
      this.activeReactionDialogueBelowIndex = null;
    }
  }

  openReactionsDialogueAnswers(i: number) {
    if (this.activeReactionDialogueAnswersIndex === i) {
      this.activeReactionDialogueAnswersIndex = null;
    } else {
      this.editCommentDialogueExpanded = false;
      this.activeReactionDialogueAnswersIndex = i;
      this.activeReactionDialogueBelowAnswersIndex = null;
    }
  }

  openReactionsDialogueBelow(chatId: string) {
    if (this.activeReactionDialogueBelowIndex === chatId) {
      this.activeReactionDialogueBelowIndex = null; 
    } else {
      this.editCommentDialogueExpanded = false;
      this.activeReactionDialogueBelowIndex = chatId; 
      this.activeReactionDialogueIndex = null;
    }
  }

  openReactionsDialogueBelowAnswers(i: number) {
    if (this.activeReactionDialogueBelowAnswersIndex === i) {
      this.activeReactionDialogueBelowAnswersIndex = null;
    } else {
      this.editCommentDialogueExpanded = false;
      this.activeReactionDialogueBelowAnswersIndex = i; 
      this.activeReactionDialogueAnswersIndex = null;
    }
  }

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

  private findOtherUserName(userIds: string[], currentUserId: string, participants: User[]): string | undefined {
    const others = userIds.filter(id => id !== currentUserId);
    if (others.length === 0) return undefined;
    return participants.find(u => u.uid === others[0])?.name || 'Unbekannt';
  }

  // private async saveOrDeleteReaction(channelId: string, chatId: string, reactionType: string, updatedUsers: string[]): Promise<void> {
  //   if (updatedUsers.length === 0) {
  //     await this.channelService.deleteReactionForChat(channelId, chatId, reactionType);
  //   } else {
  //     await this.channelService.updateReactionForChat(channelId, chatId, reactionType, updatedUsers);
  //   }
  // }
  private async saveOrDeleteReaction(channelId: string, chatId: string, reactionType: string, updatedUsers: string[]): Promise<void> {
    // Methode passt sich an die Map-Struktur an und ruft setReaction auf
    await this.channelService.setReaction(channelId, chatId, reactionType, updatedUsers);
  }


  private async updateReactionForChat(chatId: string, reactionType: string, updatedUsers: string[]): Promise<void> {
    // Hole den aktuellen Chat direkt über das Observable (du hast nur einen Chat im Thread)
    const chat = await firstValueFrom(this.chat$);
    if (!chat) return;

    const channelId = this.channelId;
    const currentUserId = this.currentUserId;
    if (!channelId || !chatId || !currentUserId) return;

    try {
      // await this.saveOrDeleteReaction(channelId, chatId, reactionType, updatedUsers);
      this.updateLocalReaction(chat, reactionType, updatedUsers);
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Reaction:', error);
    }
  }

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
    console.log('reactionType', reactionType);
    
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

  async addReactionToAnswer(answerId: string, reactionType: string) {
    const answers = await firstValueFrom(this.answers$);
    const answer = answers.find(a => a.id === answerId);
    if (!answer) return;

    this.activeReactionDialogueAnswersIndex = null;
    this.activeReactionDialogueBelowAnswersIndex = null;

    const currentReactionUsers = this.extractUserIds(answer.reactions || {}, reactionType);
    if (!currentReactionUsers.includes(this.currentUserId)) {
      const updatedUsers = [...currentReactionUsers, this.currentUserId];
      // 4. Aktualisiere Reaction-Map in Firestore via ChannelService
      await this.channelService.setAnswerReaction(this.channelId, this.chatId, answerId, reactionType, updatedUsers);
      // 5. Lokales Update der Antwort im answers$ Observable (zwingend, damit UI synchron bleibt)
      answer.reactions = { ...answer.reactions, [reactionType]: updatedUsers };
      answer.reactionArray = this.transformReactionsToArray(answer.reactions, this.participants, this.currentUserId);

      // Optional: answers$ triggern, damit Template updated wird
      this.answers$ = of([...answers]);
    }
  }

  async toggleReactionForChat(chatId: string, reactionType: string) {
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
    // console.log('toggleReactionForAnswer answerId', answerId, 'reactionType', reactionType);
    const answers = await firstValueFrom(this.answers$);
    const answer = answers.find(a => a.id === answerId);
    if (!answer) return;

    const currentReactionUsers = this.extractUserIds(answer.reactions || {}, reactionType);
    let updatedUsers: string[];
    if (currentReactionUsers.includes(this.currentUserId)) {
      updatedUsers = currentReactionUsers.filter(uid => uid !== this.currentUserId);
    } else {
      updatedUsers = [...currentReactionUsers, this.currentUserId];
    }

    await this.channelService.setAnswerReaction(this.channelId, this.chatId, answerId, reactionType, updatedUsers);

    if (updatedUsers.length === 0) {
      const { [reactionType]: _, ...rest } = answer.reactions;
      answer.reactions = rest;
    } else {
      answer.reactions = { ...answer.reactions, [reactionType]: updatedUsers };
    }
    answer.reactionArray = this.transformReactionsToArray(answer.reactions, this.participants, this.currentUserId);

    this.answers$ = of([...answers]);
  }

  private extractUserIds(reactions: Record<string, any>, reactionType: string): string[] {
    const usersRaw = reactions[reactionType] || [];
    return usersRaw.flatMap((u: string) =>
      u.includes(',') ? u.split(',').map((x: string) => x.trim()) : [u]
    );
  }

  async submitAnswer() {
    const message = this.newAnswer.trim();
    if (!message) return;
    if (!this.channelId || !this.chatId || !this.currentUserId) return;

    // Bau das Payload-Objekt
    const answer = {
      message,
      time: Math.floor(Date.now() / 1000), // oder Date.now() für ms
      user: this.currentUserId
    };
    // Store in Firestore
    await this.channelService.addAnswerToChat(this.channelId, this.chatId, answer);

    this.newAnswer = '';
    setTimeout(() => this.scrollToBottom());
  }

  handleCloseThread() {
    this.closeThread.emit();
  }

  openEditCommentDialogue() {
    this.editCommentDialogueExpanded = !this.editCommentDialogueExpanded;
  }
}