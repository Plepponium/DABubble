import { Component, Output, EventEmitter, Input, inject, OnChanges, SimpleChanges, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule, registerLocaleData } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { RoundBtnComponent } from '../round-btn/round-btn.component';
import { DialogueOverlayComponent } from '../dialogue-overlay/dialogue-overlay.component';
import { ChatAddUserOverlayComponent } from '../chat-add-user-overlay/chat-add-user-overlay.component';
import { ChannelDescriptionOverlayComponent } from '../channel-description-overlay/channel-description-overlay.component';
import { ChannelService } from '../../services/channel.service';
import { UserService } from '../../services/user.service';
import { User } from '../../models/user.class';
import { Chat } from '../../models/chat.class';
import { BehaviorSubject, combineLatest, forkJoin, map, Observable, of, switchMap, take } from 'rxjs';
import { reactionIcons } from '../reaction-icons';
// import { ChatWithDetails } from '../../models/chat-with-details.class';
import localeDe from '@angular/common/locales/de';
import { MentionsOverlayComponent } from '../shared/mentions-overlay/mentions-overlay.component';
registerLocaleData(localeDe);

@Component({
  selector: 'app-chats',
  imports: [CommonModule, FormsModule, MatFormFieldModule, MentionsOverlayComponent, MatInputModule, MatIconModule, MatButtonModule, RoundBtnComponent, DialogueOverlayComponent, ChatAddUserOverlayComponent, ChannelDescriptionOverlayComponent],
  templateUrl: './chats.component.html',
  styleUrl: './chats.component.scss',
})
export class ChatsComponent implements OnInit, OnChanges {
  value = 'Clear me';
  showChannelDescription = false;
  showUserDialogue = false;
  showAddDialogue = false;
  usersDisplayActive = false;
  editCommentDialogueExpanded = false;
  activeReactionDialogueIndex: number | null = null;
  activeReactionDialogueBelowIndex: number | null = null;
  overlayActive = false;

  currentUserId: string = '';
  channels: any[] = [];
  filteredChannels: any[] = []
  participantIds: string[] = [];
  participants: User[] = [];
  channelChats: any[] = [];
  reactionIcons = reactionIcons;
  reactionArray: { type: string, count: number, user: string[] }[] = [];
  newMessage: string = '';

  channelName$: Observable<string> = of('');
  participants$: Observable<User[]> = of([]);
  // chats$: Observable<ChatWithDetails[]> = of([]);
  private chatsSubject = new BehaviorSubject<Chat[]>([]);
  public chats$ = this.chatsSubject.asObservable();

  channelService = inject(ChannelService);
  userService = inject(UserService);

  @Input() channelId?: string;
  @Output() openThread = new EventEmitter<{ channelId: string; chatId: string }>();
  @Output() openProfile = new EventEmitter<User>();

  ngOnInit() {
    this.getCurrentUser();
    this.channelService.getChannels().pipe(take(1)).subscribe(channels => {
      this.channels = channels;
    });
    if (!this.channelId) {
      this.loadFirstChannel();
    } else {
      this.loadChannelWithId(this.channelId);
    }
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

  getCurrentUser() {
    this.userService.getCurrentUser().pipe(take(1)).subscribe(user => {
      if (user) {
        this.currentUserId = user.uid;

        // Channels laden und nur die filtern, bei denen der User Teilnehmer ist
        this.channelService.getChannels().pipe(take(1)).subscribe(channels => {
          this.channels = channels;
          this.filteredChannels = channels.filter(c =>
            c.participants.includes(this.currentUserId)
          );
        });
      }
    });
  }


  private loadFirstChannel() {
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
      this.channelService.getChatsForChannel(channelId),
      participants$
    ]).pipe(
      switchMap(([chats, users]) => {
        if (!chats.length || !users.length) return of([]);
        const enrichedChats$ = chats.map(chat => this.enrichChat(channelId, chat, users));
        return forkJoin(enrichedChats$);
      }),
      map(chats => chats.sort((a, b) => a.time - b.time))
    ).subscribe(enrichedChats => {
      this.chatsSubject.next(enrichedChats);
      setTimeout(() => this.scrollToBottom());
    });
  }

  private enrichChat(channelId: string, chat: Chat, users: User[]): Observable<Chat> {
    const normalizedReactions: Record<string, string[]> = {};
    // Reaktionen normalisieren: Falls Wert einzelner String ist, in Array umwandeln
    Object.entries(chat.reactions || {}).forEach(([key, val]) => {
      if (Array.isArray(val)) {
        normalizedReactions[key] = val;
      } else if (typeof val === 'string') {
        normalizedReactions[key] = [val];
      } else {
        normalizedReactions[key] = [];
      }
    });

    return forkJoin({
      reactions: of(normalizedReactions), // kein weiterer Firestore Call nötig
      user: of(users.find(u => u.uid === chat.user)),
      answers: this.channelService.getAnswersForChat(channelId, chat.id).pipe(take(1))
    }).pipe(
      map(({ reactions, user, answers }) => {
        const enriched: Chat = {
          ...chat,
          userName: user?.name,
          userImg: user?.img,
          answersCount: answers.length,
          lastAnswerTime: answers.length > 0 ? answers[answers.length - 1].time : null,
          reactions: reactions,
          reactionArray: this.transformReactionsToArray(reactions, users, this.currentUserId)
        };
        return enriched;
      })
    );
  }
  // private enrichChat(channelId: string, chat: Chat, users: User[]): Observable<Chat> {
  //   return forkJoin({
  //     // reactions: this.channelService.getReactionsForChat(channelId, chat.id).pipe(take(1)),
  //     // Reactions werden als Map im chat geladen
  //     reactions: of(chat.reactions || {}), // kein weiterer Firestore Call nötig
  //     user: of(users.find(u => u.uid === chat.user)),
  //     answers: this.channelService.getAnswersForChat(channelId, chat.id).pipe(take(1))
  //   }).pipe(
  //     map(({ reactions, user, answers }) => {
  //       const enriched: Chat = {
  //         ...chat,
  //         userName: user?.name,
  //         userImg: user?.img,
  //         answersCount: answers.length,
  //         lastAnswerTime: answers.length > 0 ? answers[answers.length - 1].time : null,
  //         reactions: reactions,
  //         reactionArray: this.transformReactionsToArray(reactions, users, this.currentUserId)
  //       };
  //       return enriched;
  //     })
  //   );
  // }

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
      this.activeReactionDialogueBelowIndex = null;
    }
  }

  openReactionsDialogueBelow(chatIndex: number) {
    if (this.activeReactionDialogueBelowIndex === chatIndex) {
      this.activeReactionDialogueBelowIndex = null; // schließe, wenn bereits offen
    } else {
      this.editCommentDialogueExpanded = false;
      this.activeReactionDialogueBelowIndex = chatIndex; // öffne aktuellen
      this.activeReactionDialogueIndex = null;
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

    return Object.entries(reactionsMap).map(([type, usersRaw]) => {
      const userIds = this.parseUserIds(Array.isArray(usersRaw) ? usersRaw : [usersRaw]);
      const currentUserReacted = userIds.includes(currentUserId);
      // const otherUserIds = userIds.filter(id => id !== currentUserId);
      const otherUserName = this.findOtherUserName(userIds, currentUserId, participants);
      const otherUserReacted = userIds.filter(id => id !== currentUserId).length > 1;
      // const otherUserName = otherUserIds.length > 0
      //   ? participants.find(u => u.uid === otherUserIds[0])?.name
      //   : undefined;
      // const otherUserReacted = otherUserIds.length > 0;

      return {
        type,
        count: userIds.length,
        userIds,
        currentUserReacted,
        otherUserName,
        otherUserReacted
      };
    });
  }

  private parseUserIds(users: string[]): string[] {
    return users.flatMap(u => u.includes(',') ? u.split(',').map(id => id.trim()) : [u]);
  }

  private findOtherUserName(userIds: string[], currentUserId: string, participants: User[]): string | undefined {
    const others = userIds.filter(id => id !== currentUserId);
    if (others.length === 0) return undefined;
    return participants.find(u => u.uid === others[0])?.name || 'Unbekannt';
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
    this.activeReactionDialogueBelowIndex = null;

    const currentReactionUsers = chat.reactions?.[reactionType] || [];
    if (!currentReactionUsers.includes(this.currentUserId)) {
      const updatedUsers = [...currentReactionUsers, this.currentUserId];
      await this.channelService.setReaction(this.channelId!, chat.id, reactionType, updatedUsers);
      this.updateLocalReaction(chat, reactionType, updatedUsers, chatIndex);
    }
  }

  async toggleReaction(chatIndex: number, reactionType: string) {
    const chat = await this.getChatByIndex(chatIndex);
    if (!chat) return;
    console.log(chatIndex, reactionType);
    const currentUsers = this.extractUserIds(chat.reactions || {}, reactionType);
    let updatedUsers: string[];
    if (currentUsers.includes(this.currentUserId)) {
      updatedUsers = currentUsers.filter(uid => uid !== this.currentUserId);
    } else {
      updatedUsers = [...currentUsers, this.currentUserId];
    }

    await this.channelService.setReaction(this.channelId!, chat.id, reactionType, updatedUsers);
    this.updateLocalReaction(chat, reactionType, updatedUsers, chatIndex);
  }

  private extractUserIds(reactions: Record<string, any>, reactionType: string): string[] {
    let usersRaw = reactions[reactionType];
    if (!usersRaw) return [];

    // usersRaw in Array umwandeln, falls es ein String ist
    if (!Array.isArray(usersRaw)) {
      usersRaw = [usersRaw];
    }

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
    this.openProfile.emit(user);
  }

  onEnterPress(e: KeyboardEvent) {
    if (this.overlayActive) {
      e.preventDefault();
      return;
    }

    this.submitChatMessage();
    e.preventDefault();
  }

  submitChatMessage() {
    if (!this.newMessage.trim()) return;
    if (!this.channelId || !this.currentUserId) return;

    const messagePayload = {
      message: this.newMessage.trim(),
      time: Math.floor(Date.now() / 1000),
      user: this.currentUserId
    };
    this.channelService.addChatToChannel(this.channelId, messagePayload)
      .then(() => {
        this.newMessage = '';
        setTimeout(() => this.scrollToBottom());
      })
      .catch(err => {
        console.error('Fehler beim Senden:', err);
      });
  }

  // handleOpenThread(chatId: string) {
  //   this.openThread.emit({ chatId }); // im ngFor: (click)="handleOpenThread(chat.id)"
  // }
  handleOpenThread(chatId: string) {
    // console.log('channelId', this.channelId);
    if (!this.channelId) return;
    this.openThread.emit({ channelId: this.channelId, chatId });
  }

  handleOpenProfile(chat: Chat) {
    const user = this.participants.find(u => u.uid === chat.user);
    if (user) {
      this.openProfile.emit(user);
    }
  }

  insertMention(event: { name: string, type: 'user' | 'channel' }) {
    const trigger = event.type === 'user' ? '@' : '#';
    const words = this.newMessage.split(/\s/);
    for (let i = words.length - 1; i >= 0; i--) {
      if (words[i].startsWith(trigger)) {
        words[i] = `${trigger}${event.name}`;
        break;
      }
    }
    this.newMessage = words.join(' ') + ' ';
  }

}