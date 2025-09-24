import { Component, Output, EventEmitter, Input, inject, OnChanges, SimpleChanges, OnInit } from '@angular/core';
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
import { catchError, forkJoin, map, of, Subject, switchMap, take, takeUntil, tap } from 'rxjs';
import { reactionIcons } from '../reaction-icons';
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
  // reactionIcons: string[] = [];
  reactionIcons = reactionIcons;
  reactionArray: { type: string, count: number, user: string[] }[] = [];
  currentUserId: string = '';  

  channelService = inject(ChannelService);
  userService = inject(UserService);

  @Input() channelId?: string;
  @Output() openThread = new EventEmitter<void>();

  ngOnInit() {
    this.userService.getCurrentUser().pipe(take(1)).subscribe(user => {
      if (user) {
        this.currentUserId = user.uid;
      }
      if (!this.channelId) {
        this.loadFirstChannelAndData();
      } else {
        this.loadDataForChannel(this.channelId);
      }
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['channelId']) {
      const newChannelId = changes['channelId'].currentValue;
      if (newChannelId) {
        this.channelChats = [];
        this.participants = [];
        this.channelName = '';
        this.loadDataForChannel(newChannelId);
      }
    }
  }

  private loadChannelData(channelId: string, channelName: string, participantIds: string[]) {
    this.channelId = channelId;
    this.channelName = channelName;
    this.participantIds = participantIds;

    this.loadChatsAndUsers(channelId, participantIds).subscribe(([chatsWithAnswers, users]) => {
      this.participants = users;
      this.channelChats = chatsWithAnswers;
      this.channelChats.forEach((_, index) => this.updateReactionsArrayForChat(index));
    });
  }

  private loadFirstChannelAndData() {
    this.channelService.getChannels().pipe(take(1)).subscribe(channels => {
      if (channels.length > 0) {
        const firstChannel = channels[0];
        this.loadChannelData(firstChannel.id, firstChannel.name, firstChannel.participants);
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
      this.loadChannelData(channel.id, channel.name || '', channel.participants || []);
    });
  }

  // private loadChatsAndUsers(channelId: string, participantIds: string[]): Observable<ChatsWithUsers> {
  //   return forkJoin([
  //     this.channelService.getChatsForChannel(channelId).pipe(take(1)),
  //     this.userService.getUsersByIds(participantIds).pipe(take(1))
  //   ]).pipe(switchMap(([chats, users]) => {
  //     if (chats.length === 0) {
  //       return of([[], users] as ChatsWithUsers);
  //     }
  //     const chatsWithDetails$ = chats.map(chat => forkJoin({
  //       answers: this.channelService.getAnswersForChat(channelId, chat.id).pipe(take(1), catchError(() => of([]))),
  //       reactions: this.channelService.getReactionsForChat(channelId, chat.id).pipe(catchError(() => of({})))
  //     }).pipe(map(({ answers, reactions }) => {
  //       const user = users.find(u => u.uid === chat.user);
  //       return {
  //         ...chat,
  //         userName: user?.name,
  //         userImg: user?.img,
  //         answersCount: answers.length,
  //         lastAnswerTime: answers.length > 0 ? answers[answers.length - 1].time : null,
  //         reactions,
  //         reactionArray: this.transformReactionsToArray(reactions, users, this.currentUserId)
  //       };
  //     })));
  //     return forkJoin(chatsWithDetails$).pipe(
  //       map(chatsWithDetails => {
  //         chatsWithDetails.sort((a, b) => a.time - b.time);
  //         return [chatsWithDetails, users] as ChatsWithUsers;
  //       })
  //     );
  //   }));
  // }

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
            map(({answers, reactions}) => {
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

  //   const data = Object.entries(reactionsMap).map(([type, users]) => {
  //     // Stelle sicher, dass alle User IDs als Array vorliegen
  //     const userArray = users.flatMap(u => u.includes(',') ? u.split(',').map(id => id.trim()) : [u]);
  //     const currentUserReacted = userArray.includes(currentUserId);
  //     // Finde alle User außer currentUserId
  //     const others = userArray.filter(id => id !== currentUserId);
  //     // Hole optional Namen des ersten anderen
  //     const otherUserName = others.length
  //       ? participants.find(u => u.uid === others[0])?.name || 'Unbekannt'
  //       : undefined;
  //     const otherUserReacted = others.length > 1;
      
  //     return {
  //       type,
  //       count: userArray.length,
  //       userIds: userArray,
  //       currentUserReacted,
  //       otherUserName,
  //       otherUserReacted
  //     };
  //   });

  //   // console.log('transformToArray', reactionsMap, data);
  //   return data;
  // }

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

  openAddComment() {}

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

  openDialogueShowProfile() {
    this.showProfileDialogue = true;
  }

  closeDialogueShowProfile() {
    this.showProfileDialogue = false;
  }


  //zum speichern von time in firebase (noch nicht in Verwendung)
  handleAddChatToChannel() {
    const date = new Date('2024-05-08T12:13:00Z'); // Z für UTC
    const unixTimestamp = Math.floor(date.getTime() / 1000);
    console.log(unixTimestamp); // 1702061580
  }

  addToChats() { }

  handleOpenThread() {
    this.openThread.emit();
  }
}
