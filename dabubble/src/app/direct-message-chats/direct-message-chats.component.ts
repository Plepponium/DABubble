import { Component, ElementRef, ViewChild, inject, Input, SimpleChanges, Output, EventEmitter, ViewChildren, QueryList } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { combineLatest, map, Observable, shareReplay, Subscription, takeUntil } from 'rxjs';
import { RoundBtnComponent } from '../round-btn/round-btn.component';
import { User } from '../../models/user.class';
import { UserService } from '../../services/user.service';
import { DirectMessageService } from '../../services/direct-messages.service';
import { reactionIcons } from '../reaction-icons';
import { ReactionIconsDialogComponent } from '../reaction-icons-dialog/reaction-icons-dialog.component';
import { DmReactionsDialogComponent } from '../dm-reactions-dialog/dm-reactions-dialog.component';
import { MentionsOverlayComponent } from '../shared/mentions-overlay/mentions-overlay.component';
import { SmileyOverlayComponent } from "../shared/smiley-overlay/smiley-overlay.component";
import { DirectMessageUtilsService } from '../../services/direct-message-utils.service';
import { SafeHtml } from '@angular/platform-browser';
import { LogoutService } from '../../services/logout.service';

@Component({
  selector: 'app-direct-message-chats',
  imports: [CommonModule, FormsModule, MentionsOverlayComponent, DmReactionsDialogComponent, ReactionIconsDialogComponent, RoundBtnComponent, SmileyOverlayComponent],
  templateUrl: './direct-message-chats.component.html',
  styleUrls: ['./direct-message-chats.component.scss']
})
export class DirectMessageChatsComponent {
  @ViewChildren('chatMessageRow') chatMessageRows!: QueryList<ElementRef>;
  @ViewChild('messageInput') messageInput!: ElementRef<HTMLTextAreaElement>;
  @Input() userId!: string;
  @Output() openProfile = new EventEmitter<User>();

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
  activeReactionDialog = { messageId: null as string | null, source: null as 'chat' | 'hover' | null };
  showAllReactions: Record<number, boolean> = {};
  activeSmiley = false;
  allSmileys = reactionIcons;
  editSmileyActive: { [messageId: string]: boolean } = {};
  devForceLoading = false;

  private authSub?: Subscription;
  private subs = new Subscription();
  private initializedForUserId?: string;
  private firstLoad = true;
  private lastMessageCount = 0;

  private userService = inject(UserService);
  private dmService = inject(DirectMessageService);
  private utils = inject(DirectMessageUtilsService);
  logoutService = inject(LogoutService);
  private destroy$ = this.logoutService.logout$;

  /** Initializes current user subscription and triggers chat setup */
  ngOnInit(): void {
    this.authSub = this.userService.getCurrentUser().pipe(
      takeUntil(this.destroy$)).subscribe(user => {
        this.currentUser = user;
        this.ensureInitialized();
      });
  }

  /** Reacts to changes of @Input userId */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['userId'] && !changes['userId'].firstChange) {
      this.ensureInitialized();
    }
  }

  /** Cleans up all subscriptions */
  ngOnDestroy(): void {
    this.authSub?.unsubscribe();
    this.subs.unsubscribe();
  }

  /** Focuses message input when clicking outside textarea (within input bar). @param event MouseEvent */
  focusInput(event: MouseEvent): void {
    if (event.target === this.messageInput?.nativeElement ||
      (event.target instanceof HTMLElement && event.target.closest('.input-icon-bar'))) {
      return;
    }
    this.messageInput?.nativeElement?.focus();
  }

  /** Initializes chat only once per userId */
  private ensureInitialized(): void {
    if (!this.userId || !this.currentUser) return;
    if (this.initializedForUserId === this.userId) return;
    this.initializedForUserId = this.userId;
    void this.initializeChat();
  }

  /** Setup: Subscriptions, DM-ID, Observables, Focus */
  private async initializeChat(): Promise<void> {
    if (!this.currentUser) return;
    this.subs.unsubscribe();
    this.subs = new Subscription();
    this.subscribeToOtherUser();
    await this.initializeDmId();
    this.setupUsersObservable();
    this.setupMessagesObservable();
    this.focusMessageInput();
  }

  /** Fetches/creates DM-ID for currentUser + partner */
  private async initializeDmId(): Promise<void> {
    if (!this.currentUser) return;
    this.dmId = await this.dmService.getOrCreateDmId(this.currentUser!.uid, this.userId);
  }

  /** Creates users$ observable with user map for mentions */
  private setupUsersObservable(): void {
    this.users$ = this.userService.getUsers().pipe(
      map(users => this.processUsers(users)),
      shareReplay(1)
    );
  }

  /** Processes users: Sets mentionUsers + creates UID map */
  private processUsers(users: User[]): Record<string, User> {
    this.mentionUsers = users.map(u => this.utils.toMentionUser(u));
    return this.utils.toUserMap(users);
  }

  /** Toggle smiley overlay */
  openSmileyOverlay(): void {
    this.activeSmiley = !this.activeSmiley;
  }

  /** Inserts smiley into messageText at cursor position. @param smiley e.g. 'thumbs-up' */
  onSmileySelected(smiley: string): void {
    const textarea = this.messageInput.nativeElement;
    const { start, end } = this.utils.getSelectionRange(textarea);
    this.messageText = this.utils.insertTextAt(this.messageText, `:${smiley}:`, start, end);
    this.utils.setCursorPosition(textarea, start + smiley.length + 2);
    this.activeSmiley = false;
  }

  /** Template: Visible reactions (max 7 or all if showAll). @param message Message object @param index Index for showAllReactions lookup */
  getVisibleReactions(message: any, index: number): { type: string; count: number }[] {
    return this.utils.getVisibleReactions(message, index, this.showAllReactions);
  }

  /** Inserts @mention into messageText at mentionCaretIndex. @param event {name, type: 'user'|'channel'|'email'} */
  insertMention(event: { name: string; type: 'user' | 'channel' | 'email' }): void {
    const trigger = event.type === 'user' ? '@' : '#';
    const pos = this.mentionCaretIndex ?? this.messageText.length;
    const { replaced, after } = this.utils.buildMentionText(this.messageText, pos, trigger, event.name);
    this.messageText = replaced + ' ' + after;
    this.mentionCaretIndex = replaced.length + 1;
    this.utils.focusTextareaAt(this.messageInput.nativeElement, this.mentionCaretIndex!);
    this.overlayActive = false;
  }

  /** Updates mentionCaretIndex from textarea selection */
  updateCaretPosition(): void {
    const textarea = this.messageInput?.nativeElement;
    if (!textarea) return;
    this.mentionCaretIndex = textarea.selectionStart;
  }

  /** Updates _caretIndex for edit textarea */
  updateEditCaret(chat: any, textarea: HTMLTextAreaElement): void {
    chat._caretIndex = textarea.selectionStart;
  }

  /** Inserts mention into edit textarea of a message. @param message Message being edited @param event Mention data */
  insertMentionInEdit(message: any, event: { name: string; type: 'user' | 'channel' | 'email' }): void {
    const trigger = event.type === 'user' ? '@' : '#';
    const pos = message._caretIndex ?? message.editedText.length;
    const { replaced, after } = this.utils.buildMentionText(message.editedText, pos, trigger, event.name);
    message.editedText = replaced + ' ' + after;
    message._caretIndex = replaced.length + 1;
    this.utils.focusEditTextarea(message.id, message._caretIndex);
  }

  /** Inserts character (e.g. '@') at cursor in messageText. @param character Default: '@' */
  insertAtCursor(character: string = '@'): void {
    const textarea = this.messageInput.nativeElement;
    const { start, end } = this.utils.getSelectionRange(textarea);
    this.messageText = this.utils.insertTextAt(this.messageText, character, start, end);
    this.mentionCaretIndex = start + character.length;
    this.utils.setCursorPosition(textarea, this.mentionCaretIndex);
  }

  /** Setup messages$ with enrichMessages pipe */
  private setupMessagesObservable(): void {
    if (!this.dmId || !this.users$) return;
    const rawMessages$ = this.dmService.getMessages(this.dmId);
    this.messages$ = combineLatest([rawMessages$, this.users$]).pipe(
      map(([messages, users]) => this.enrichMessages(messages, users))
    );
    this.subscribeToMessages();
  }

  /** Subscription to otherUser updates */
  private subscribeToOtherUser(): void {
    const s = this.userService.getSingleUserById(this.userId).pipe(
      takeUntil(this.destroy$)).subscribe(u => this.otherUser = u);
    this.subs.add(s);
  }

  /** Enriches messages with senderName, senderImg, reactions */
  private enrichMessages(messages: any[], users: Record<string, User>): any[] {
    return messages.map(m => ({
      ...m,
      senderName: users[m.senderId]?.name || 'Unknown',
      senderImg: users[m.senderId]?.img || 'default-user',
      reactions: m.reactions || {}
    }));
  }

  /** Subscription to messages$ for latestMessages + scroll */
  private subscribeToMessages(): void {
    if (!this.messages$) return;
    const s = this.messages$.pipe(
      takeUntil(this.destroy$)).subscribe(msgs => this.handleNewMessages(msgs));
    this.subs.add(s);
  }

  /** Handles new messages, updates latestMessages, scrolls if needed */
  private handleNewMessages(msgs: any[]): void {
    if (!msgs) return;
    const newMessageCount = msgs.length;
    const isNewMessage = newMessageCount > this.lastMessageCount;
    this.latestMessages = msgs;
    this.lastMessageCount = newMessageCount;
    if (this.firstLoad || isNewMessage) {
      setTimeout(() => this.utils.scrollToBottom(), 0);
      this.firstLoad = false;
    }
  }

  /** Sends message on Enter (unless overlay active). @param e KeyboardEvent */
  onEnterPress(e: KeyboardEvent): void {
    if (this.overlayActive) { e.preventDefault(); return; }
    this.sendMessage();
    e.preventDefault();
  }

  /** Sends messageText, clears input, scrolls */
  async sendMessage(): Promise<void> {
    const text = (this.messageText || '').trim();
    if (!text || !this.dmId || !this.currentUser) return;
    await this.dmService.sendMessage(this.dmId, { senderId: this.currentUser!.uid, text });
    this.messageText = '';
    this.utils.scrollToBottom();
  }

  /** Updates message text server-side. @param event {messageId, newText} */
  async updateMessageText(event: { messageId: string; newText: string }): Promise<void> {
    if (!this.dmId || !event.messageId || !event.newText.trim()) return;
    try {
      await this.dmService.updateMessageText(this.dmId, event.messageId, event.newText.trim());
    } catch (err) {
      console.error('Error updating message:', err);
    }
  }

  /** Adds reaction to message. @param event {messageId, icon} */
  async addReaction(event: { messageId: string; icon: string }): Promise<void> {
    if (!event?.messageId || !this.currentUser || !this.dmId) return;
    try {
      await this.dmService.addReactionToMessage(this.dmId, event.messageId, event.icon, this.currentUser.uid);
      this.activeReactionDialog = { messageId: null, source: null };
    } catch (err) {
      console.error('Error adding reaction:', err);
    }
  }

  /** TrackBy for *ngFor reactions. @param _index Index (unused) @param reaction {type, count} */
  trackReaction(_index: number, reaction: { type: string; count: number }): string {
    return reaction.type;
  }

  /** Toggle reaction for message (add/remove). @param message Message @param type Reaction type */
  async onReactionClick(message: any, type: string): Promise<void> {
    if (!this.dmId || !this.currentUser || !message?.id) return;
    try {
      await this.dmService.reactToMessageToggle(this.dmId, message.id, type, this.currentUser.uid);
    } catch (err) {
      console.error('Reaction error:', err);
    }
  }

  /** Template: Hover text for reactions (You/Partner reacted). @param userIds Array of UIDs */
  getReactionHoverText(userIds: string[]): string {
    return this.utils.getReactionHoverText(userIds, this.currentUser?.uid, this.otherUser);
  }

  /** Toggle reaction dialog for message. @param messageId Target message ID @param source 'chat' | 'hover' */
  toggleReactionDialog(messageId: string, source: 'chat' | 'hover'): void {
    if (this.activeReactionDialog.messageId === messageId && this.activeReactionDialog.source === source) {
      this.activeReactionDialog = { messageId: null, source: null };
    } else {
      this.activeReactionDialog = { messageId, source };
    }
  }

  /** Enables edit mode for message (exclusive). @param message Message to edit */
  enableEditMessage(message: any): void {
    this.latestMessages.forEach(m => m.isEditing = false);
    message.isEditing = true;
    message.editedText = message.text;
    this.focusAndAutoGrow(message.id);
  }

  /** Toggles edit smiley overlay for specific message, closes others. */
  toggleEditSmiley(messageId: string): void {
    this.editSmileyActive[messageId] = !this.editSmileyActive[messageId];
    Object.keys(this.editSmileyActive).forEach(id => {
      if (id !== messageId) this.editSmileyActive[id] = false;
    });
  }

  /** Inserts emoji into edit textarea at cursor, updates caret position. */
  insertSmileyInEdit(message: any, emoji: string, textarea: HTMLTextAreaElement): void {
    const caretPos = textarea.selectionStart || 0;
    message.editedText = message.editedText.slice(0, caretPos) + `:${emoji}:` + message.editedText.slice(caretPos);
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = caretPos + emoji.length + 2;
      this.updateEditCaret(message, textarea);
    });
    this.editSmileyActive[message.id] = false;
  }

  /** Focuses edit textarea + auto-grow + cursor to end. @param messageId ID of editing message */
  focusAndAutoGrow(messageId: string): void {
    setTimeout(() => {
      const ta = document.getElementById(`edit-${messageId}`) as HTMLTextAreaElement | null;
      if (ta) {
        this.utils.autoGrow(ta);
        ta.focus();
        const len = ta.value.length;
        ta.setSelectionRange(len, len);
      }
    }, 0);
  }

  /** Cancel edit: Reset to original text */
  cancelEditMessage(message: any): void {
    message.isEditing = false;
    message.editedText = message.text;
  }

  /** Save edit: Update server + local */
  saveEditedMessage(message: any): void {
    const newText = message.editedText.trim();
    if (!newText) return;
    this.updateMessageText({ messageId: message.id, newText });
    message.text = newText;
    message.isEditing = false;
  }

  /** Opens sender's profile. @param senderId UID of sender */
  onUserNameClick(senderId: string): void {
    const sender = this.otherUser?.uid === senderId ? this.otherUser :
      this.currentUser?.uid === senderId ? this.currentUser : undefined;
    if (sender) this.openProfile.emit(sender);
  }

  /** Focuses messageInput after setup */
  private focusMessageInput(): void {
    setTimeout(() => this.messageInput?.nativeElement.focus(), 0);
  }

  /** Checks self-chat (currentUser.uid === otherUser.uid) */
  isSelf(): boolean {
    return this.otherUser?.uid === this.currentUser?.uid;
  }

  /** Template: Compares dates for same day. @param d1 First date @param d2 Second date */
  isSameDate(d1: Date | undefined, d2: Date | undefined): boolean {
    return this.utils.isSameDate(d1, d2);
  }

  /** Template: 'Today', 'Yesterday' or long date. @param date Date to format */
  getDisplayDate(date: Date | undefined): string {
    return this.utils.getDisplayDate(date);
  }

  /** Template: Array of all reactions with counts. @param message Message */
  getReactionArray(message: any): { type: string; count: number }[] {
    return this.utils.getReactionArray(message);
  }

  /** Template: Auto-resize textarea. @param el HTMLTextAreaElement */
  autoGrow(el: HTMLTextAreaElement | null): void {
    this.utils.autoGrow(el);
  }

  /** Template: Render text with emoji images as SafeHtml. @param text Raw message text */
  renderMessage(text: string): SafeHtml {
    return this.utils.renderMessage(text);
  }

  /** Template: Smooth-scroll to message. @param messageId Target ID */
  scrollToMessage(messageId: string): void {
    const chatRow = this.chatMessageRows.find(row => row.nativeElement.dataset['messageId'] === messageId)?.nativeElement;
    if (chatRow) chatRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}
