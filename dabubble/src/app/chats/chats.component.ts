import { Component, Output, EventEmitter, Input, inject, OnChanges, SimpleChanges, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule, registerLocaleData } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { RoundBtnComponent } from '../round-btn/round-btn.component';
import { DialogueOverlayComponent } from '../dialogue-overlay/dialogue-overlay.component';
import { ProfileOverlayComponent } from '../profile-overlay/profile-overlay.component';
import { ChatAddUserOverlayComponent } from '../chat-add-user-overlay/chat-add-user-overlay.component';
import { ChannelDescriptionOverlayComponent } from '../channel-description-overlay/channel-description-overlay.component';
import { ChannelService } from '../../services/channel.service';
import { UserService } from '../../services/user.service';
import { User } from '../../models/user.class';
import { BehaviorSubject, catchError, combineLatest, forkJoin, map, Observable, of, Subject, switchMap, take, takeUntil, tap } from 'rxjs';
import { reactionIcons } from '../reaction-icons';
import { Chat } from '../../models/chat.class';
import { ChatWithDetails } from '../../models/chat-with-details.class';
import localeDe from '@angular/common/locales/de';
registerLocaleData(localeDe);

@Component({
  selector: 'app-chats',
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatIconModule, MatButtonModule, RoundBtnComponent, DialogueOverlayComponent, ProfileOverlayComponent, ChatAddUserOverlayComponent, ChannelDescriptionOverlayComponent],
  templateUrl: './chats.component.html',
  styleUrl: './chats.component.scss',
})
export class ChatsComponent implements OnInit, OnChanges {
  value = 'Clear me';
  showChannelDescription = false;
  showUserDialogue = false;
  showAddDialogue = false;
  usersDisplayActive = false;
  showProfileDialogue = false;
  editCommentDialogueExpanded = false;
  activeReactionDialogueIndex: number | null = null;
  activeReactionDialogueBelowIndex: number | null = null;
  channelName = '';
  participantIds: string[] = [];
  participants: User[] = [];
  channelChats: any[] = [];
  reactionIcons = reactionIcons;
  reactionArray: { type: string, count: number, user: string[] }[] = [];
  currentUserId: string = '';
  newMessage: string = '';
  selectedProfileUser?: User;

  channelName$: Observable<string> = of('');
  participants$: Observable<User[]> = of([]);
  // chats$: Observable<ChatWithDetails[]> = of([]);
  private chatsSubject = new BehaviorSubject<ChatWithDetails[]>([]);
  public chats$ = this.chatsSubject.asObservable();

  channelService = inject(ChannelService);
  userService = inject(UserService);

  @Input() channelId?: string;
  @Output() openThread = new EventEmitter<void>();
  // @ViewChild('chatHistory') chatHistory!: ElementRef<HTMLDivElement>;

  ngOnInit() {
    this.userService.getCurrentUser().pipe(take(1)).subscribe(user => {
      if (user) {
        this.currentUserId = user.uid;
      }
      if (!this.channelId) {
        this.loadFirstChannelWithoutId();
      } else {
        this.loadChannelWithId(this.channelId);
      }
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['channelId']) {
      const newChannelId = changes['channelId'].currentValue;
      if (newChannelId) {
        this.loadChannelWithId(newChannelId);
      }
    }
  }

  scrollToBottom() {
    const chatHistory = document.getElementById('chat-history');
    if (chatHistory) {
      chatHistory.scrollTop = chatHistory.scrollHeight;
    }
  }

  private loadFirstChannelWithoutId() {
    this.channelService.getChannels().pipe(take(1)).subscribe(channels => {
      if (channels.length > 0) {
        const firstChannel = channels[0];
        this.channelId = firstChannel.id;
        this.channelName$ = of(firstChannel.name);
        this.participants$ = this.userService.getUsersByIds(firstChannel.participants);
        this.subscribeToParticipants();
        this.subscribeToChatsAndUsers(this.channelId, this.participants$);
      } else {
      }
    });
  }

  private loadChannelWithId(channelId: string) {
    this.channelService.getChannelById(channelId).pipe(take(1)).subscribe(channel => {
      if (!channel) return;

      this.channelId = channelId;
      this.channelName$ = of(channel.name);
      this.participants$ = this.userService.getUsersByIds(channel.participants);
      this.subscribeToParticipants();
      this.subscribeToChatsAndUsers(channelId, this.participants$);
    });
  }

  subscribeToParticipants() {
    this.participants$.subscribe(users => {
      this.participants = users;
    });
  }
  
  private subscribeToChatsAndUsers(channelId: string, participants$: Observable<User[]>) {
    combineLatest([
      this.getChatsForChannel(channelId),
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

  private getChatsForChannel(channelId: string): Observable<Chat[]> {
    return this.channelService.getChatsForChannel(channelId).pipe(
      // tap(chats => console.log('[getChatsForChannel] Chats:', chats))
    );
  }

  // Anreichern eines einzelnen Chats um User/Reactions/Answers
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
    if (!date) return '';

    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (this.isSameDate(date, today)) {
      return 'Heute';
    } else if (this.isSameDate(date, yesterday)) {
      return 'Gestern';
    } else {
      // normales Datum: Montag, 20. September
      return new Intl.DateTimeFormat('de-DE', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      }).format(date);
    }
  }

  openReactionsDialogue(chatIndex: number) {
    if (this.activeReactionDialogueIndex === chatIndex) {
      this.activeReactionDialogueIndex = null; // schließe, wenn bereits offen
    } else {
      this.editCommentDialogueExpanded = false;
      this.activeReactionDialogueIndex = chatIndex; // öffne aktuellen
    }
  }

  openReactionsDialogueBelow(chatIndex: number) {
    if (this.activeReactionDialogueBelowIndex === chatIndex) {
      this.activeReactionDialogueBelowIndex = null; // schließe, wenn bereits offen
    } else {
      this.editCommentDialogueExpanded = false;
      this.activeReactionDialogueBelowIndex = chatIndex; // öffne aktuellen
    }
  }

  transformReactionsToArray(
    reactionsMap: Record<string, string[]>,
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
    // console.log('transformToArray', reactionsMap, data);
    return Object.entries(reactionsMap).map(([type, usersRaw]) =>
      this.buildReactionObject(type, usersRaw, participants, currentUserId)
    );
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

  private async updateReactionForChat(chatIndex: number, reactionType: string, updatedUsers: string[]): Promise<void> {
    // Hier hole den aktuellen State vom BehaviorSubject (nicht von channelChats)
    const chats = this.chatsSubject.getValue();
    const chat = chats[chatIndex];
    if (!chat) return;

    const channelId = this.channelId;
    const chatId = chat.id;
    const currentUserId = this.currentUserId;
    if (!channelId || !chatId || !currentUserId) return;

    try {
      await this.saveOrDeleteReaction(channelId, chatId, reactionType, updatedUsers);
      this.updateLocalReaction(chat, reactionType, updatedUsers, chatIndex);
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Reaction:', error);
    }
  }

  private updateLocalReaction(chat: any, reactionType: string, updatedUsers: string[], chatIndex: number) {
    chat.reactions = { ...chat.reactions };
    if (updatedUsers.length === 0) {
      delete chat.reactions[reactionType];
    } else {
      chat.reactions[reactionType] = updatedUsers;
    }
    chat.reactionArray = this.transformReactionsToArray(chat.reactions, this.participants, this.currentUserId);

    // Aktualisiere den BehaviorSubject State mit neuem Chat Objekt
    const chats = this.chatsSubject.getValue();
    const newChats = [...chats];
    newChats[chatIndex] = chat;  // Ersetze den Chat an Index
    this.chatsSubject.next(newChats); 
  }

  async addReaction(chatIndex: number, reactionType: string) {
    const chats = this.chatsSubject.getValue();
    const chat = chats[chatIndex];
    if (!chat) return;

    this.activeReactionDialogueIndex = null;
    const currentReactionUsers = this.extractUserIds(chat.reactions || {}, reactionType);
    if (!currentReactionUsers.includes(this.currentUserId)) {
      const updatedUsers = [...currentReactionUsers, this.currentUserId];
      await this.updateReactionForChat(chatIndex, reactionType, updatedUsers);
    }
  }

  async toggleReaction(chatIndex: number, reactionType: string) {
    const chat = await this.getChatByIndex(chatIndex);
    if (!chat) return;

    const currentReactionUsers = this.extractUserIds(chat.reactions || {}, reactionType);
    let updatedUsers: string[];
    if (currentReactionUsers.includes(this.currentUserId)) {
      updatedUsers = currentReactionUsers.filter(uid => uid !== this.currentUserId);
    } else {
      updatedUsers = [...currentReactionUsers, this.currentUserId];
    }

    await this.updateReactionForChat(chatIndex, reactionType, updatedUsers);
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

  openAddComment() { }

  openEditCommentDialogue() {
    this.activeReactionDialogueIndex = null;
    this.editCommentDialogueExpanded = !this.editCommentDialogueExpanded;
  }

  openDialogChannelDescription() {
    this.showChannelDescription = true;
  };

  closeDialogChannelDescription() {
    this.showChannelDescription = false;
  }

  openDialogueShowUser() {
    this.showUserDialogue = true;
    this.usersDisplayActive = true;
  }

  closeDialogueShowUser() {
    this.showUserDialogue = false;
    if (this.showAddDialogue = false) {
      this.usersDisplayActive = false;
    }
  }

  openDialogueAddUser() {
    this.showAddDialogue = true;
    this.showUserDialogue = false;
  }

  closeDialogueAddUser() {
    this.showAddDialogue = false;
    this.usersDisplayActive = false;
  }

  openDialogueShowProfile(user: User) {
    this.selectedProfileUser = user;
    this.showProfileDialogue = true;
  }

  closeDialogueShowProfile() {
    this.showProfileDialogue = false;
    this.selectedProfileUser = undefined;
  }

  submitChatMessage() {
    if (!this.newMessage.trim()) return;      // Leere Eingabe unterdrücken
    if (!this.channelId || !this.currentUserId) return;

    const messagePayload = {
      message: this.newMessage.trim(),
      time: Math.floor(Date.now() / 1000),    // UNIX-Timestamp in Sekunden
      user: this.currentUserId
    };
    // console.log(messagePayload);
    this.channelService.addChatToChannel(this.channelId, messagePayload)
      .then(() => {
        this.newMessage = '';
        setTimeout(() => this.scrollToBottom());
      })
      .catch(err => {
        // Optionale Fehlerbehandlung
        console.error('Fehler beim Senden:', err);
      });
  }

  handleOpenThread() {
    this.openThread.emit();
  }
}