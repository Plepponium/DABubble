import { Component, ElementRef, ViewChild, inject, Input, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, of, combineLatest, firstValueFrom } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { RoundBtnComponent } from '../round-btn/round-btn.component';
import { User } from '../../models/user.class';
import { UserService } from '../../services/user.service';
import { DirectMessageService } from '../../services/direct-messages.service';
import { reactionIcons } from '../reaction-icons';
import { ReactionIconsDialogComponent } from '../reaction-icons-dialog/reaction-icons-dialog.component';
import { DmReactionsDialogComponent } from '../dm-reactions-dialog/dm-reactions-dialog.component';

@Component({
  selector: 'app-direct-message-chats',
  imports: [RoundBtnComponent, CommonModule, FormsModule, DmReactionsDialogComponent, ReactionIconsDialogComponent],
  templateUrl: './direct-message-chats.component.html',
  styleUrls: ['./direct-message-chats.component.scss']
})
export class DirectMessageChatsComponent {
  @ViewChild('messageInput') messageInput!: ElementRef<HTMLTextAreaElement>;
  @Input() userId!: string;
  private userService = inject(UserService);
  private dmService = inject(DirectMessageService);

  dmId?: string;
  currentUser?: User;
  otherUser?: User;
  messages$?: Observable<any[]>;
  users$?: Observable<Record<string, User>>;
  messageText = '';
  latestMessages: any[] = [];
  reactionIcons: string[] = reactionIcons;
  activeReactionDialog: { messageId: string | null; source: 'chat' | 'hover' | null } = {
    messageId: null,
    source: null
  };


  private firstLoad = true;
  private lastMessageCount = 0;

  async ngOnChanges(changes: SimpleChanges) {
    if (changes['userId'] && this.userId) {
      await this.initializeChat();
    }
  }

  private async initializeChat() {
    this.currentUser = await this.fetchCurrentUser();
    if (!this.currentUser) return this.clearMessages();

    this.subscribeToOtherUser();
    await this.initializeDmId();
    this.setupUsersObservable();
    this.setupMessagesObservable();
    this.focusMessageInput();
  }

  private async fetchCurrentUser(): Promise<User | undefined> {
    return firstValueFrom(this.userService.getCurrentUser());
  }

  private clearMessages() {
    this.messages$ = of([]);
  }

  private subscribeToOtherUser() {
    this.userService.getSingleUserById(this.userId).subscribe(u => this.otherUser = u);
  }

  private async initializeDmId() {
    this.dmId = await this.dmService.getOrCreateDmId(this.currentUser!.uid, this.userId);
  }

  private setupUsersObservable() {
    this.users$ = this.userService.getUsersByIds([this.currentUser!.uid, this.userId]).pipe(
      map(users =>
        users.reduce((map, u) => {
          map[u.uid] = u;
          return map;
        }, {} as Record<string, User>)
      ),
      shareReplay(1)
    );
  }

  private setupMessagesObservable() {
    if (!this.dmId || !this.users$) return;
    const rawMessages$ = this.dmService.getMessages(this.dmId);
    this.messages$ = combineLatest([rawMessages$, this.users$]).pipe(
      map(([messages, users]) => this.enrichMessages(messages, users))
    );
    this.subscribeToMessages();
  }


  private enrichMessages(messages: any[], users: Record<string, User>): any[] {
    return messages.map(m => ({
      ...m,
      senderName: users[m.senderId]?.name || 'Unbekannt',
      senderImg: users[m.senderId]?.img || 'default-user',
      reactions: m.reactions || {}
    }));
  }

  private subscribeToMessages() {
    if (!this.messages$) return;
    this.messages$.subscribe(msgs => this.handleNewMessages(msgs));
  }


  private handleNewMessages(msgs: any[]) {
    if (!msgs) return;
    const newMessageCount = msgs.length;
    const isNewMessage = newMessageCount > this.lastMessageCount;

    this.latestMessages = msgs;
    this.lastMessageCount = newMessageCount;

    if (this.firstLoad || isNewMessage) {
      setTimeout(() => this.scrollToBottom(), 0);
      this.firstLoad = false;
    }
  }



  private scrollToBottom() {
    const container = document.getElementById("dm-chat-content");
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }

  private focusMessageInput() {
    setTimeout(() => {
      this.messageInput?.nativeElement.focus();
    }, 0);
  }

  isSelf(): boolean {
    return this.otherUser?.uid === this.currentUser?.uid;
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
      return new Intl.DateTimeFormat('de-DE', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      }).format(date);
    }
  }

  async sendMessage() {
    const text = (this.messageText || '').trim();
    if (!text || !this.dmId || !this.currentUser) return;

    await this.dmService.sendMessage(this.dmId, {
      senderId: this.currentUser.uid,
      text
    });

    this.messageText = '';
    this.scrollToBottom();
  }

  async addReaction(event: { messageId: string; icon: string }) {
    if (!event?.messageId || !this.currentUser || !this.dmId) return;

    try {
      await this.dmService.addReactionToMessage(this.dmId, event.messageId, event.icon, this.currentUser.uid);
      this.activeReactionDialog = { messageId: null, source: null };
    } catch (err) {
      console.error('Fehler beim Hinzufügen der Reaktion:', err);
    }
  }

  async onReactionClick(message: any, type: string) {
    if (!this.dmId || !this.currentUser || !message?.id) return;
    try {
      await this.dmService.reactToMessageToggle(this.dmId, message.id, type, this.currentUser.uid);
    } catch (err) {
      console.error('Reaction Fehler:', err);
    }
  }

  getReactionHoverText(userIds: string[]): string {
    if (!userIds || userIds.length === 0) return '';

    const currentUid = this.currentUser?.uid;
    const otherUser = this.otherUser;
    const currentUserReacted = userIds.includes(currentUid || '');
    const otherUserReacted = userIds.includes(otherUser?.uid || '');
    if (currentUserReacted && !otherUserReacted) {
      return 'Du hast reagiert';
    }
    if (!currentUserReacted && otherUserReacted) {
      return `${otherUser?.name || 'Unbekannt'} hat reagiert`;
    }
    if (currentUserReacted && otherUserReacted) {
      return `${otherUser?.name || 'Unbekant'} und Du haben reagiert`;
    }
    return '';
  }

  toggleReactionDialog(messageId: string, source: 'chat' | 'hover') {
    if (this.activeReactionDialog.messageId === messageId && this.activeReactionDialog.source === source) {
      this.activeReactionDialog = { messageId: null, source: null };
    } else {
      this.activeReactionDialog = { messageId, source };
    }
  }

  openEditComment(id: string) {
    console.log("Id: ", id);
  }


}
