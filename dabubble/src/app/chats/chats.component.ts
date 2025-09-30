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
import { catchError, forkJoin, map, Observable, of, Subject, switchMap, take, takeUntil, tap } from 'rxjs';
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
  chats$: Observable<ChatWithDetails[]> = of([]);

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
        this.loadFirstChannelAndData();
      } else {
        // this.loadDataForChannel(this.channelId);
        // this.subscribeToChatsAndUsers(this.channelId, this.participantIds);
        this.channelService.getChannelById(this.channelId).pipe(take(1)).subscribe(channel => {
          if (!channel) return;
          this.participantIds = channel.participants || [];
          this.subscribeToChatsAndUsers(this.channelId!, this.participantIds);
        });
      }
    });
  }

  // ngOnChanges(changes: SimpleChanges) {
  //   if (changes['channelId']) {
  //     const newChannelId = changes['channelId'].currentValue;
  //     if (newChannelId) {
  //       // console.log(newChannelId);
  //       this.channelChats = [];
  //       this.participants = [];
  //       this.channelName = '';
  //       this.loadDataForChannel(newChannelId);
  //       this.subscribeToChatsAndUsers(newChannelId, this.participantIds);
  //     }
  //   }
  // }
  ngOnChanges(changes: SimpleChanges) {
    if (changes['channelId']) {
      const newChannelId = changes['channelId'].currentValue;
      if (newChannelId) {
        this.channelChats = [];
        this.participants = [];
        this.channelName = '';
        this.channelService.getChannelById(newChannelId).pipe(take(1)).subscribe(channel => {
          if (!channel) return;
          this.channelId = newChannelId;
          this.channelName = channel.name || '';
          this.participantIds = channel.participants || [];
          this.subscribeToChatsAndUsers(this.channelId!, this.participantIds);
        });
      }
    }
  }

  scrollToBottom() {
    const chatHistory = document.getElementById('chat-history');
    if (chatHistory) {
      chatHistory.scrollTop = chatHistory.scrollHeight;
    }
  }  

  // private subscribeToChatsAndUsers(channelId: string, participantIds: string[]) {
  //   this.chats$ = this.channelService.getChatsForChannel(channelId).pipe(
  //     switchMap((chats: Chat[]) =>
  //       this.userService.getUsersByIds(participantIds).pipe(
  //         map(users => {
  //           this.participants = users; // damit auch andere Komponenten Zugriff auf User haben
  //           return chats; // Du kannst hier bei Bedarf Chats anreichern mit Nutzerdaten
  //         })
  //       )
  //     )
  //   );

  //   // Optional: scroll to bottom immer, wenn sich chats ändern
  //   this.chats$.subscribe(() => {
  //     setTimeout(() => this.scrollToBottom());
  //   });
  // }

  private loadFirstChannelAndData() {
    this.channelService.getChannels().pipe(take(1)).subscribe(channels => {
      if (channels.length > 0) {
        const firstChannel = channels[0];
        this.channelId = firstChannel.id;
        this.channelName$ = of(firstChannel.name);
        this.participants$ = this.userService.getUsersByIds(firstChannel.participants);

        // this.channelName = firstChannel.name;
        // this.participantIds = firstChannel.participants;
        // console.log(firstChannel.id, firstChannel.name, firstChannel.participants);
        this.subscribeToChatsAndUsers(this.channelId, this.participantIds);
        // this.loadChannelData(firstChannel.id, firstChannel.name, firstChannel.participants);
      } else {
        this.participants = [];
        this.channelChats = [];
      }
    });
  }

  private loadDataForChannel(channelId: string) {
    this.channelService.getChannelById(channelId).pipe(take(1)).subscribe(channel => {
      if (!channel) return;

      this.channelId = channelId;
      this.channelName = channel.name || '';
      this.participantIds = channel.participants || [];
      this.subscribeToChatsAndUsers(channelId, this.participantIds);
      // this.loadChannelData(channel.id, channel.name || '', channel.participants || []);
    });
  }

  private loadChannelData(channelId: string, channelName: string, participantIds: string[]) {
    this.channelId = channelId;
    this.channelName$ = of(channelName);
    this.participants$ = this.userService.getUsersByIds(participantIds);

    // this.channelName = channelName;
    // this.participantIds = participantIds;

    this.loadChatsAndUsers(channelId, participantIds).subscribe(([chatsWithAnswers, users]) => {
      this.participants = users;
      this.channelChats = chatsWithAnswers;
      setTimeout(() => this.scrollToBottom());
      this.channelChats.forEach((_, index) => this.updateReactionsArrayForChat(index));
    });
  }

  private subscribeToChatsAndUsers(channelId: string, participantIds: string[]) {
    // console.log('subscribeToChatsAndUsers called with', channelId, participantIds);
    // this.userService.getUsersByIds(participantIds).subscribe(users => {
    //   console.log('Geladene User:', users);
    // });
    this.chats$ = this.channelService.getChatsForChannel(channelId).pipe(
      tap(chats => console.log('Chats vom Service:', chats)),
      switchMap((chats: Chat[]) =>
        this.userService.getUsersByIds(participantIds).pipe(
          tap(users => console.log('Geladene Nutzer:', users)),
          switchMap(users => {
            // Für jede Chat-Nachricht Reaktionen & weitere Infos holen und alles anreichern
            const chatsWithDetails$ = chats.map(chat =>
              forkJoin({
                reactions: this.channelService.getReactionsForChat(channelId, chat.id).pipe(catchError(() => of({}))),
                user: of(users.find(u => u.uid === chat.user)), // User aus Nutzerliste
                // Weitere Details (Answers):
                answers: this.channelService.getAnswersForChat(channelId, chat.id).pipe(catchError(() => of([]))),
              }).pipe(
                map(({reactions, user, answers}) => ({
                  ...chat,
                  userName: user?.name,
                  userImg: user?.img,
                  answersCount: answers.length,
                  lastAnswerTime: answers.length > 0 ? answers[answers.length - 1].time : null,
                  reactions,
                  reactionArray: this.transformReactionsToArray(reactions, users, this.currentUserId)
                }))
              )
            );
            // return forkJoin(chatsWithDetails$);
            return forkJoin(chatsWithDetails$).pipe(
              tap(chatsWithDetails => console.log('Anreicherte Chats:', chatsWithDetails))
            );
          })
        )
      ),
      // Chats nach Zeit sortieren      
      map((enrichedChats: any[]) => enrichedChats.sort((a, b) => a.time - b.time)),
      tap(data => console.log('Chats mit Details geladen:', data))
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

  // Lädt Chats und Userdaten parallel und verknüpft Antworten mit Chats
  private loadChatsAndUsers(channelId: string, participantIds: string[]) {
    return forkJoin([
      this.channelService.getChatsForChannel(channelId).pipe(take(1)),
      this.userService.getUsersByIds(participantIds).pipe(take(1))
    ]).pipe(
      switchMap(([chats, users]) => {
        if (!chats.length) {
          return of([[], users] as [any[], User[]]);
        }

        // Für jeden Chat parallel Antworten und Reactions laden
        const chatsWithDetails$ = chats.map(chat =>
          forkJoin({
            answers: this.channelService.getAnswersForChat(channelId, chat.id).pipe(take(1), catchError(() => of([]))),
            reactions: this.channelService.getReactionsForChat(channelId, chat.id).pipe(catchError(() => of({})))
          }).pipe(
            map(({ answers, reactions }) => {
              // console.log('channelId', channelId, 'chat.id', chat.id);
              const user = users.find(u => u.uid === chat.user);
              const chatsWithDetails = {
                ...chat,
                userName: user?.name,
                userImg: user?.img,
                answersCount: answers.length,
                lastAnswerTime: answers.length > 0 ? answers[answers.length - 1].time : null,
                reactions,
                reactionArray: this.transformReactionsToArray(reactions, users, this.currentUserId)
              };
              // console.log('chatWithDetails', chatsWithDetails);
              return chatsWithDetails;
            })
          )
        );

        return forkJoin(chatsWithDetails$).pipe(
          map(chatsWithDetails => {
            chatsWithDetails.sort((a, b) => a.time - b.time);
            return [chatsWithDetails, users] as [any[], User[]];
          })
        );
      })
    );
  }

  openReactionsDialogue(chatIndex: number) {
    if (this.activeReactionDialogueIndex === chatIndex) {
      this.activeReactionDialogueIndex = null; // schließe, wenn bereits offen
    } else {
      this.editCommentDialogueExpanded = false;
      this.activeReactionDialogueIndex = chatIndex; // öffne aktuellen
    }
  }

  private parseUserIds(users: string[]): string[] {
    return users.flatMap(u => u.includes(',') ? u.split(',').map(id => id.trim()) : [u]);
  }

  private findOtherUserName(userIds: string[], currentUserId: string, participants: User[]): string | undefined {
    const others = userIds.filter(id => id !== currentUserId);
    if (others.length === 0) return undefined;
    return participants.find(u => u.uid === others[0])?.name || 'Unbekannt';
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

  private updateReactionsArrayForChat(chatIndex: number) {
    if (this.channelChats[chatIndex]?.reactions) {
      const data = this.transformReactionsToArray(this.channelChats[chatIndex].reactions, this.participants, this.currentUserId);
      // console.log('data', data);
    } else {
      this.reactionArray = [];
    }
  }

  private extractUserIds(reactions: Record<string, any>, reactionType: string): string[] {
    const usersRaw = reactions[reactionType] || [];
    return usersRaw.flatMap((u: string) =>
      u.includes(',') ? u.split(',').map((x: string) => x.trim()) : [u]
    );
  }

  private async saveOrDeleteReaction(channelId: string, chatId: string, reactionType: string, updatedUsers: string[]): Promise<void> {
    if (updatedUsers.length === 0) {
      await this.channelService.deleteReactionForChat(channelId, chatId, reactionType);
    } else {
      await this.channelService.updateReactionForChat(channelId, chatId, reactionType, updatedUsers);
    }
  }

  private updateLocalReaction(chat: any, reactionType: string, updatedUsers: string[]) {
    chat.reactions = { ...chat.reactions };
    if (updatedUsers.length === 0) {
      delete chat.reactions[reactionType];
    } else {
      chat.reactions[reactionType] = updatedUsers;
    }
    chat.reactionArray = this.transformReactionsToArray(chat.reactions, this.participants, this.currentUserId);
  }

  private async updateReactionForChat(chatIndex: number, reactionType: string, updatedUsers: string[]): Promise<void> {
    const chat = this.channelChats[chatIndex];
    if (!chat) return;

    const channelId = this.channelId;
    const chatId = chat.id;
    const currentUserId = this.currentUserId;
    if (!channelId || !chatId || !currentUserId) return;

    try {
      await this.saveOrDeleteReaction(channelId, chatId, reactionType, updatedUsers);
      this.updateLocalReaction(chat, reactionType, updatedUsers);
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Reaction:', error);
    }
  }

  async addReaction(chatIndex: number, reactionType: string) {
    const chat = this.channelChats[chatIndex];
    if (!chat) return;

    this.activeReactionDialogueIndex = null;
    const currentReactionUsers = this.extractUserIds(chat.reactions || {}, reactionType);
    if (!currentReactionUsers.includes(this.currentUserId)) {
      const updatedUsers = [...currentReactionUsers, this.currentUserId];
      await this.updateReactionForChat(chatIndex, reactionType, updatedUsers);
    }
  }

  async toggleReaction(chatIndex: number, reactionType: string) {
    const chat = this.channelChats[chatIndex];
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