import { Component, ElementRef, ViewChild, inject, Input, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, of, combineLatest, firstValueFrom, Subscription } from 'rxjs';
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
  @Output() openProfile = new EventEmitter<string>();

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

  private authSub?: Subscription;
  private subs = new Subscription();

  private initializedForUserId?: string;

  private firstLoad = true;
  private lastMessageCount = 0;

  ngOnInit(): void {
    this.authSub = this.userService.getCurrentUser().subscribe(user => {
      this.currentUser = user;
      this.ensureInitialized();
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    this.ensureInitialized();
  }

  ngOnDestroy(): void {
    this.authSub?.unsubscribe();
    this.subs.unsubscribe();
  }

  private ensureInitialized() {
    if (!this.userId || !this.currentUser) return;
    if (this.initializedForUserId === this.userId) return;
    this.initializedForUserId = this.userId;
    void this.initializeChat();
  }


  private async initializeChat() {
    if (!this.currentUser) return;
    this.subs.unsubscribe();
    this.subs = new Subscription();

    this.subscribeToOtherUser();
    await this.initializeDmId();
    this.setupUsersObservable();
    this.setupMessagesObservable();
    this.focusMessageInput();
  }

  private async initializeDmId() {
    if (!this.currentUser) return;
    this.dmId = await this.dmService.getOrCreateDmId(this.currentUser!.uid, this.userId);
  }

  private setupUsersObservable() {
    if (!this.currentUser) return;
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

  // private async fetchCurrentUser(): Promise<User | undefined> {
  //   return firstValueFrom(this.userService.getCurrentUser());
  // }

  // private clearMessages() {
  //   this.messages$ = of([]);
  // }

  private setupMessagesObservable() {
    if (!this.dmId || !this.users$) return;
    const rawMessages$ = this.dmService.getMessages(this.dmId);
    this.messages$ = combineLatest([rawMessages$, this.users$]).pipe(
      map(([messages, users]) => this.enrichMessages(messages, users))
    );
    this.subscribeToMessages();
  }

  private subscribeToOtherUser() {
    const s = this.userService.getSingleUserById(this.userId).subscribe(u => this.otherUser = u);
    this.subs.add(s);
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
    const s = this.messages$.subscribe(msgs => this.handleNewMessages(msgs));
    this.subs.add(s);
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

  async updateMessageText(event: { messageId: string; newText: string }) {
    if (!this.dmId || !event.messageId || !event.newText.trim()) return;

    try {
      await this.dmService.updateMessageText(this.dmId, event.messageId, event.newText.trim());
    } catch (err) {
      console.error('Fehler beim Aktualisieren der Nachricht:', err);
    }
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
      return `${otherUser?.name || 'Unbekannt'} und Du haben reagiert`;
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

  enableEditMessage(message: any) {
    this.latestMessages.forEach(m => m.isEditing = false);
    message.isEditing = true;
    message.editedText = message.text;
    this.focusAndAutoGrow(message.id);
  }

  focusAndAutoGrow(messageId: string) {
    setTimeout(() => {
      const ta = document.getElementById(`edit-${messageId}`) as HTMLTextAreaElement | null;
      if (ta) {
        this.autoGrow(ta);
        ta.focus();
        const len = ta.value.length;
        ta.setSelectionRange(len, len);
      }
    }, 0);
  }

  cancelEditMessage(message: any) {
    message.isEditing = false;
    message.editedText = message.text;
  }

  saveEditedMessage(message: any) {
    const newText = message.editedText.trim();
    if (!newText) return;

    this.updateMessageText({ messageId: message.id, newText });
    message.text = newText;
    message.isEditing = false;
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

  autoGrow(el: HTMLTextAreaElement | null) {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }


}
