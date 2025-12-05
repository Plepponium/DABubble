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
import { MentionsOverlayComponent } from '../shared/mentions-overlay/mentions-overlay.component';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { SmileyOverlayComponent } from "../shared/smiley-overlay/smiley-overlay.component";

@Component({
  selector: 'app-direct-message-chats',
  imports: [CommonModule, FormsModule, MentionsOverlayComponent, DmReactionsDialogComponent, ReactionIconsDialogComponent, RoundBtnComponent, SmileyOverlayComponent],
  templateUrl: './direct-message-chats.component.html',
  styleUrls: ['./direct-message-chats.component.scss']
})
export class DirectMessageChatsComponent {
  @ViewChild('messageInput') messageInput!: ElementRef<HTMLTextAreaElement>;

  @Input() userId!: string;
  @Output() openProfile = new EventEmitter<User>();

  private userService = inject(UserService);
  private dmService = inject(DirectMessageService);

  dmId?: string;
  currentUser?: User;
  otherUser?: User;
  messages$?: Observable<any[]>;
  users$?: Observable<Record<string, User>>;
  messageText = '';
  mentionCaretIndex: number | null = null;
  latestMessages: any[] = [];
  reactionIcons: string[] = reactionIcons;
  overlayActive = false;
  mentionUsers: Pick<User, 'uid' | 'name' | 'img' | 'presence'>[] = [];
  activeReactionDialog: { messageId: string | null; source: 'chat' | 'hover' | null } = {
    messageId: null,
    source: null
  };
  showAllReactions: Record<number, boolean> = {};

  activeSmiley = false;
  allSmileys = reactionIcons;

  private authSub?: Subscription;
  private subs = new Subscription();

  private initializedForUserId?: string;

  private firstLoad = true;
  private lastMessageCount = 0;

  constructor(private sanitizer: DomSanitizer) { }

  ngOnInit(): void {
    this.authSub = this.userService.getCurrentUser().subscribe(user => {
      this.currentUser = user;
      this.ensureInitialized();
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['userId'] && !changes['userId'].firstChange) {
      this.ensureInitialized();
    }
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
    this.users$ = this.userService.getUsers().pipe(
      map(users => {
        this.mentionUsers = users.map(u => ({
          uid: u.uid,
          name: u.name,
          img: u.img || 'default-user',
          presence: u.presence || 'offline'
        }));

        const userMap: Record<string, User> = {};
        users.forEach(u => userMap[u.uid] = u);
        return userMap;
      }),
      shareReplay(1)
    );
  }

  openSmileyOverlay() {
    this.activeSmiley = !this.activeSmiley;
  }

  onSmileySelected(smiley: string) {
    const textarea = this.messageInput.nativeElement;

    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;

    const before = this.messageText.slice(0, start);
    const after = this.messageText.slice(end);

    this.messageText = before + `:${smiley}:` + after;

    const caret = start + smiley.length + 2;

    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = caret;
      textarea.focus();
    });

    this.activeSmiley = false;
  }

  getReactionArray(message: any): { type: string; count: number }[] {
    if (!message.reactions) return [];
    return Object.keys(message.reactions)
      .map(type => ({
        type,
        count: message.reactions[type]?.length || 0
      }))
      .filter(r => r.count > 0)
      .sort((a, b) => a.type.localeCompare(b.type));
  }

  getVisibleReactions(message: any, index: number): { type: string; count: number }[] {
    const all = this.getReactionArray(message);
    const showAll = this.showAllReactions[index] ?? false;
    if (showAll) {
      return all;
    }
    return all.slice(0, 7); 
  }

  insertMention(event: { name: string; type: 'user' | 'channel' | 'email' }) {
    const trigger = event.type === 'user' ? '@' : '#';
    const pos = this.mentionCaretIndex ?? this.messageText.length;
    const before = this.messageText.slice(0, pos);
    const after = this.messageText.slice(pos);
    const replaced = before.replace(/([@#])([^\s]*)$/, `${trigger}${event.name}`);
    this.messageText = replaced + ' ' + after;
    const textarea = this.messageInput.nativeElement;
    this.mentionCaretIndex = replaced.length + 1;

    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = this.mentionCaretIndex!;
      this.updateCaretPosition();
      textarea.focus();
    });
    this.overlayActive = false;
  }

  updateCaretPosition() {
    const textarea = this.messageInput?.nativeElement;
    if (!textarea) return;
    this.mentionCaretIndex = textarea.selectionStart;
  }

  updateEditCaret(chat: any, textarea: HTMLTextAreaElement) {
    chat._caretIndex = textarea.selectionStart;
  }

  insertMentionInEdit(
    message: any,
    event: { name: string; type: 'user' | 'channel' | 'email' }
  ) {
    const trigger = event.type === 'user' ? '@' : '#';
    const pos = message._caretIndex ?? message.editedText.length;
    const before = message.editedText.slice(0, pos);
    const after = message.editedText.slice(pos);
    const replaced = before.replace(/([@#])([^\s]*)$/, `${trigger}${event.name}`);
    message.editedText = replaced + ' ' + after;
    message._caretIndex = replaced.length + 1;
    setTimeout(() => {
      const textarea = document.getElementById(`edit-${message.id}`) as HTMLTextAreaElement;
      if (textarea) {
        textarea.selectionStart = textarea.selectionEnd = message._caretIndex;
        textarea.focus();
      }
    });
  }

  insertAtCursor(character: string = '@') {
    const textarea = this.messageInput.nativeElement;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = this.messageText.slice(0, start);
    const after = this.messageText.slice(end);
    this.messageText = before + character + after;
    this.mentionCaretIndex = start + character.length;
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = this.mentionCaretIndex!;
      textarea.focus();
    }); 0
  }

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

  onEnterPress(e: KeyboardEvent) {
    if (this.overlayActive) {
      e.preventDefault();
      return;
    }
    this.sendMessage();
    e.preventDefault();
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

  trackReaction(_index: number, reaction: { type: string; count: number }): string {
    return reaction.type; // Eindeutig pro Reaction-Typ
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
    if (!userIds?.length) return '';
    const reacted = this.getReactionState(userIds);
    if (this.isChatWithSelf()) return reacted.current ? 'Du hast reagiert' : '';

    return this.buildReactionText(reacted.current, reacted.other);
  }

  private getReactionState(userIds: string[]) {
    const current = userIds.includes(this.currentUser?.uid || '');
    const other = userIds.includes(this.otherUser?.uid || '');
    return { current, other };
  }

  private isChatWithSelf(): boolean {
    return this.currentUser?.uid === this.otherUser?.uid;
  }

  private buildReactionText(current: boolean, other: boolean): string {
    const name = this.otherUser?.name || 'Unbekannt';

    if (current && !other) return 'Du hast reagiert';
    if (!current && other) return `${name} hat reagiert`;
    if (current && other) return `${name} und Du haben reagiert`;

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

  onUserNameClick(senderId: string) {
    const sender = this.otherUser?.uid === senderId
      ? this.otherUser
      : this.currentUser?.uid === senderId
        ? this.currentUser
        : undefined;

    if (sender) {
      this.openProfile.emit(sender);
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

  autoGrow(el: HTMLTextAreaElement | null) {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
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