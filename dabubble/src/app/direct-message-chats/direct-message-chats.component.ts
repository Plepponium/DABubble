import { Component, ElementRef, ViewChild, inject, Input, SimpleChanges, Output, EventEmitter, ViewChildren, QueryList } from '@angular/core';
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
  @ViewChildren('chatMessageRow') chatMessageRows!: QueryList<ElementRef<HTMLElement>>;
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
  private userService = inject(UserService);
  private dmService = inject(DirectMessageService);
  private sanitizer = inject(DomSanitizer)

  /**
  * Lifecycle hook: Initialize current user subscription
  */
  ngOnInit(): void {
    this.authSub = this.userService.getCurrentUser().subscribe(user => {
      this.currentUser = user;
      this.ensureInitialized();
    });
  }

  /**
  * Lifecycle hook: React to userId input changes
  * @param changes - SimpleChanges object from Angular
  */
  ngOnChanges(changes: SimpleChanges) {
    if (changes['userId'] && !changes['userId'].firstChange) {
      this.ensureInitialized();
    }
  }

  /**
  * Lifecycle hook: Clean up all subscriptions
  */
  ngOnDestroy(): void {
    this.authSub?.unsubscribe();
    this.subs.unsubscribe();
  }

  /**
  * Focuses message input when clicking outside textarea but within input area
  * @param event - Mouse event
  */
  focusInput(event: MouseEvent) {
    if (event.target === this.messageInput?.nativeElement ||
      event.target instanceof HTMLElement &&
      event.target.closest('.input-icon-bar')) {
      return;
    }
    this.messageInput?.nativeElement?.focus();
  }

  /**
  * Ensures chat is initialized for current userId and currentUser
  */
  private ensureInitialized() {
    if (!this.userId || !this.currentUser) return;
    if (this.initializedForUserId === this.userId) return;
    this.initializedForUserId = this.userId;
    void this.initializeChat();
  }

  /**
  * Initializes chat: subscriptions, DM ID, observables, focus
  */
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

  /**
  * Initializes or creates DM ID for current user and partner
  */
  private async initializeDmId() {
    if (!this.currentUser) return;
    this.dmId = await this.dmService.getOrCreateDmId(this.currentUser!.uid, this.userId);
  }

  /**
  * Sets up users observable with mention users and user map
  */
  private setupUsersObservable() {
    this.users$ = this.userService.getUsers().pipe(
      map(users => this.processUsers(users)),
      shareReplay(1)
    );
  }

  /**
  * Processes users array: extracts mention users and creates user map
  * @param users - Array of User objects
  * @returns User map by UID
  */
  private processUsers(users: User[]): Record<string, User> {
    this.mentionUsers = users.map(u => this.toMentionUser(u));
    return this.toUserMap(users);
  }

  /**
  * Converts full User object to minimal mention format for overlay display
  * @param u - Complete User object
  * @returns Minimal user data for mentions
  */
  private toMentionUser(u: User): Pick<User, 'uid' | 'name' | 'img' | 'presence'> {
    return {
      uid: u.uid,
      name: u.name,
      img: u.img || 'default-user',
      presence: u.presence || 'offline'
    };
  }

  /**
  * Creates lookup map of users by UID for efficient access
  * @param users - Array of User objects
  * @returns Object map with UID as key, User as value
  */
  private toUserMap(users: User[]): Record<string, User> {
    const userMap: Record<string, User> = {};
    users.forEach(u => userMap[u.uid] = u);
    return userMap;
  }

  /**
  * Toggles visibility of smiley overlay
  */
  openSmileyOverlay() {
    this.activeSmiley = !this.activeSmiley;
  }

  /**
  * Handles smiley selection and inserts into message at cursor position
  * @param smiley - Selected smiley name (e.g. 'thumbs-up')
  */
  onSmileySelected(smiley: string) {
    const textarea = this.messageInput.nativeElement;
    const { start, end } = this.getSelectionRange(textarea);
    this.messageText = this.insertTextAt(this.messageText, `:${smiley}:`, start, end);
    this.setCursorPosition(textarea, start + smiley.length + 2);
    this.activeSmiley = false;
  }

  /**
  * Extracts current selection range from textarea
  * @param textarea - Target textarea element
  * @returns Object with start and end positions
  */
  private getSelectionRange(textarea: HTMLTextAreaElement): { start: number; end: number } {
    return {
      start: textarea.selectionStart ?? 0,
      end: textarea.selectionEnd ?? 0
    };
  }

  /**
  * Inserts text at specific position in string
  * @param text - Original text
  * @param insert - Text to insert
  * @param start - Start position
  * @param end - End position (replacement range)
  * @returns Modified text with insertion
  */
  private insertTextAt(text: string, insert: string, start: number, end: number): string {
    return text.slice(0, start) + insert + text.slice(end);
  }

  /**
  * Sets cursor position in textarea with focus
  * @param textarea - Target textarea element
  * @param position - Cursor position
  */
  private setCursorPosition(textarea: HTMLTextAreaElement, position: number) {
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = position;
      textarea.focus();
    });
  }

  /**
  * Converts message reactions object to sorted array with counts
  * @param message - Message object with reactions property
  * @returns Array of reaction objects {type, count}
  */
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

  /**
  * Returns visible reactions for message (max 7 or all if showAll)
  * @param message - Message object
  * @param index - Message index for showAllReactions lookup
  * @returns Array of visible reaction objects
  */
  getVisibleReactions(message: any, index: number): { type: string; count: number }[] {
    const all = this.getReactionArray(message);
    const showAll = this.showAllReactions[index] ?? false;
    if (showAll) {
      return all;
    }
    return all.slice(0, 7);
  }

  /**
  * Inserts mention into main message textarea at current caret position
  * @param event - Mention selection event with name and type
  */
  insertMention(event: { name: string; type: 'user' | 'channel' | 'email' }) {
    const trigger = event.type === 'user' ? '@' : '#';
    const pos = this.mentionCaretIndex ?? this.messageText.length;
    const { replaced, after } = this.buildMentionText(this.messageText, pos, trigger, event.name);
    this.messageText = replaced + ' ' + after;
    this.mentionCaretIndex = replaced.length + 1;
    this.focusTextareaAt(this.messageInput.nativeElement, this.mentionCaretIndex);
    this.overlayActive = false;
  }

  /**
  * Builds mention text by replacing trigger word at end of before-text
  * @param text - Complete text
  * @param pos - Caret position
  * @param trigger - @ or #
  * @param name - Mention name to insert
  * @returns Object with replaced before-text and remaining after-text
  */
  private buildMentionText(text: string, pos: number, trigger: string, name: string) {
    const before = text.slice(0, pos);
    const after = text.slice(pos);
    const replaced = before.replace(/([@#])([^\s]*)$/, `${trigger}${name}`);
    return { replaced, after };
  }

  /**
  * Sets cursor position in textarea and updates caret tracking
  * @param textarea - Target textarea element
  * @param position - New cursor position
  */
  private focusTextareaAt(textarea: HTMLTextAreaElement, position: number) {
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = position;
      this.updateCaretPosition();
      textarea.focus();
    });
  }

  /**
  * Updates mention caret index from main message textarea selectionStart
  */
  updateCaretPosition() {
    const textarea = this.messageInput?.nativeElement;
    if (!textarea) return;
    this.mentionCaretIndex = textarea.selectionStart;
  }

  /**
  * Updates caret index for message edit textarea
  * @param chat - Message object with _caretIndex property
  * @param textarea - Edit textarea element
  */
  updateEditCaret(chat: any, textarea: HTMLTextAreaElement) {
    chat._caretIndex = textarea.selectionStart;
  }

  /**
  * Inserts mention into message edit textarea at current caret position
  * @param message - Message being edited
  * @param event - Mention selection event with name and type
  */
  insertMentionInEdit(message: any, event: { name: string; type: 'user' | 'channel' | 'email' }) {
    const trigger = event.type === 'user' ? '@' : '#';
    const pos = message._caretIndex ?? message.editedText.length;
    const { replaced, after } = this.buildMentionText(message.editedText, pos, trigger, event.name);
    message.editedText = replaced + ' ' + after;
    message._caretIndex = replaced.length + 1;
    this.focusEditTextarea(message.id, message._caretIndex);
  }

  /**
  * Sets cursor position in message edit textarea
  * @param messageId - ID of the message being edited
  * @param position - New cursor position
  */
  private focusEditTextarea(messageId: string, position: number) {
    setTimeout(() => {
      const textarea = document.getElementById(`edit-${messageId}`) as HTMLTextAreaElement;
      if (textarea) {
        textarea.selectionStart = textarea.selectionEnd = position;
        textarea.focus();
      }
    });
  }

  /**
  * Inserts character at current cursor position in main message textarea
  * @param character - Character to insert (default: '@')
  */
  insertAtCursor(character: string = '@') {
    const textarea = this.messageInput.nativeElement;
    const { start, end } = this.getSelectionRange(textarea);
    this.messageText = this.insertTextAt(this.messageText, character, start, end);
    this.mentionCaretIndex = start + character.length;
    this.setCursorPosition(textarea, this.mentionCaretIndex);
  }

  /**
  * Sets up enriched messages observable combining raw messages and users
  */
  private setupMessagesObservable() {
    if (!this.dmId || !this.users$) return;
    const rawMessages$ = this.dmService.getMessages(this.dmId);
    this.messages$ = combineLatest([rawMessages$, this.users$]).pipe(
      map(([messages, users]) => this.enrichMessages(messages, users))
    );
    this.subscribeToMessages();
  }

  /**
  * Subscribes to chat partner's user data updates
  */
  private subscribeToOtherUser() {
    const s = this.userService.getSingleUserById(this.userId).subscribe(u => this.otherUser = u);
    this.subs.add(s);
  }

  /**
  * Adds user data (name, image) and reactions to message objects.
  * @param {any[]} messages - Array of message objects to enrich.
  * @param {Record<string, User>} users - Record of users keyed by user ID.
  * @returns {any[]} Array of enriched message objects.
  */
  private enrichMessages(messages: any[], users: Record<string, User>): any[] {
    return messages.map(m => ({
      ...m,
      senderName: users[m.senderId]?.name || 'Unbekannt',
      senderImg: users[m.senderId]?.img || 'default-user',
      reactions: m.reactions || {}
    }));
  }

  /**
  * Subscribes to the message stream and handles new incoming messages.
  */
  private subscribeToMessages() {
    if (!this.messages$) return;
    const s = this.messages$.subscribe(msgs => this.handleNewMessages(msgs));
    this.subs.add(s);
  }

  /**
  * Handles new incoming messages and scrolls to bottom if necessary.
  * @param {any[]} msgs - Array of new message objects.
  */
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

  /**
  * Handles pressing the Enter key to send a message unless overlay is active.
  * @param {KeyboardEvent} e - Keyboard event triggered on keypress.
  */
  onEnterPress(e: KeyboardEvent) {
    if (this.overlayActive) { e.preventDefault(); return; }
    this.sendMessage();
    e.preventDefault();
  }

  /**
  * Sends a message if valid DM ID and user are set.
  */
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

  /**
  * Updates an existing message’s text.
  * @param {{ messageId: string, newText: string }} event - Object containing the message ID and new text.
  */
  async updateMessageText(event: { messageId: string; newText: string }) {
    if (!this.dmId || !event.messageId || !event.newText.trim()) return;
    try {
      await this.dmService.updateMessageText(this.dmId, event.messageId, event.newText.trim());
    } catch (err) {
      console.error('Fehler beim Aktualisieren der Nachricht:', err);
    }
  }

  /**
  * Adds a reaction to a message for the current user.
  * @param {{ messageId: string, icon: string }} event - Reaction event data.
  */
  async addReaction(event: { messageId: string; icon: string }) {
    if (!event?.messageId || !this.currentUser || !this.dmId) return;
    try {
      await this.dmService.addReactionToMessage(this.dmId, event.messageId, event.icon, this.currentUser.uid);
      this.activeReactionDialog = { messageId: null, source: null };
    } catch (err) {
      console.error('Fehler beim Hinzufügen der Reaktion:', err);
    }
  }

  /**
  * Tracking function for ngFor optimizations of reactions.
  * @param {number} _index - List index (unused).
  * @param {{ type: string, count: number }} reaction - Reaction data.
  * @returns {string} Reaction type key.
  */
  trackReaction(_index: number, reaction: { type: string; count: number }): string {
    return reaction.type;
  }

  /**
  * Toggles a reaction for a given message.
  * @param {any} message - The message object to react to.
  * @param {string} type - Reaction type or icon key.
  */
  async onReactionClick(message: any, type: string) {
    if (!this.dmId || !this.currentUser || !message?.id) return;
    try {
      await this.dmService.reactToMessageToggle(this.dmId, message.id, type, this.currentUser.uid);
    } catch (err) {
      console.error('Reaction Fehler:', err);
    }
  }

  /**
  * Returns hover tooltip text for reactions based on user IDs.
  * @param {string[]} userIds - Array of user IDs who reacted.
  * @returns {string} Descriptive hover text.
  */
  getReactionHoverText(userIds: string[]): string {
    if (!userIds?.length) return '';
    const reacted = this.getReactionState(userIds);
    if (this.isChatWithSelf()) return reacted.current ? 'Du hast reagiert' : '';
    return this.buildReactionText(reacted.current, reacted.other);
  }

  /**
  * Determines if current user or other user reacted.
  * @param {string[]} userIds - Array of user IDs.
  * @returns {{ current: boolean, other: boolean }} Reaction state.
  */
  private getReactionState(userIds: string[]) {
    const current = userIds.includes(this.currentUser?.uid || '');
    const other = userIds.includes(this.otherUser?.uid || '');
    return { current, other };
  }

  /**
  * Checks if chat is with yourself.
  * @returns {boolean} True if chatting with self.
  */
  private isChatWithSelf(): boolean {
    return this.currentUser?.uid === this.otherUser?.uid;
  }

  /**
  * Builds textual description for reactions.
  * @param {boolean} current - Whether current user reacted.
  * @param {boolean} other - Whether other user reacted.
  * @returns {string} Localized reaction text.
  */
  private buildReactionText(current: boolean, other: boolean): string {
    const name = this.otherUser?.name || 'Unbekannt';
    if (current && !other) return 'Du hast reagiert';
    if (!current && other) return `${name} hat reagiert`;
    if (current && other) return `${name} und Du haben reagiert`;
    return '';
  }

  /**
  * Toggles the visibility of the reaction dialog for a message.
  * @param {string} messageId - Message ID for the dialog.
  * @param {'chat' | 'hover'} source - Trigger source type.
  */
  toggleReactionDialog(messageId: string, source: 'chat' | 'hover') {
    if (this.activeReactionDialog.messageId === messageId && this.activeReactionDialog.source === source) {
      this.activeReactionDialog = { messageId: null, source: null };
    } else {
      this.activeReactionDialog = { messageId, source };
    }
  }

  /**
  * Enables edit mode for a specific message.
  * @param {any} message - The message object to edit.
  */
  enableEditMessage(message: any) {
    this.latestMessages.forEach(m => m.isEditing = false);
    message.isEditing = true;
    message.editedText = message.text;
    this.focusAndAutoGrow(message.id);
  }

  /**
  * Focuses the edit textarea and adjusts its height automatically.
  * @param {string} messageId - ID of the message being edited.
  */
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

  /**
  * Cancels editing of a message and restores its original text.
  * @param {any} message - The message object being edited.
  */
  cancelEditMessage(message: any) {
    message.isEditing = false;
    message.editedText = message.text;
  }

  /**
  * Saves edited message text and updates server.
  * @param {any} message - The message object being updated.
  */
  saveEditedMessage(message: any) {
    const newText = message.editedText.trim();
    if (!newText) return;
    this.updateMessageText({ messageId: message.id, newText });
    message.text = newText;
    message.isEditing = false;
  }

  /**
  * Emits an event to open the profile of the clicked sender.
  * @param {string} senderId - The ID of the clicked sender.
  */
  onUserNameClick(senderId: string) {
    const sender =
      this.otherUser?.uid === senderId ? this.otherUser : this.currentUser?.uid ===
        senderId ? this.currentUser : undefined;
    if (sender) {
      this.openProfile.emit(sender);
    }
  }

  /**
  * Scrolls the chat container to the bottom.
  */
  private scrollToBottom() {
    const container = document.getElementById("dm-chat-content");
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }

  /**
  * Focuses the message input field.
  */
  private focusMessageInput() {
    setTimeout(() => {
      this.messageInput?.nativeElement.focus();
    }, 0);
  }

  /**
  * Checks if the conversation partner is the same as the current user.
  * @returns {boolean} True if self-DM.
  */
  isSelf(): boolean {
    return this.otherUser?.uid === this.currentUser?.uid;
  }

  /**
  * Compares two dates to see if they fall on the same day.
  * @param {Date | undefined} d1 - First date.
  * @param {Date | undefined} d2 - Second date.
  * @returns {boolean} True if the same calendar day.
  */
  isSameDate(d1: Date | undefined, d2: Date | undefined): boolean {
    if (!d1 || !d2) return false;
    return d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate();
  }

  /**
  * Returns a human-readable display date label.
  * @param {Date | undefined} date - Date to format.
  * @returns {string} Localized date string like 'Heute', 'Gestern', etc.
  */
  getDisplayDate(date: Date | undefined): string {
    if (!date) return '';
    if (this.isToday(date)) return 'Heute';
    if (this.isYesterday(date)) return 'Gestern';
    return this.formatDateLong(date);
  }

  /**
  * Checks if given date is today.
  * @param {Date} date - Date to check.
  * @returns {boolean} True if today.
  */
  private isToday(date: Date): boolean {
    return this.isSameDate(date, new Date());
  }

  /**
  * Checks if given date is yesterday.
  * @param {Date} date - Date to check.
  * @returns {boolean} True if yesterday.
  */
  private isYesterday(date: Date): boolean {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return this.isSameDate(date, yesterday);
  }

  /**
  * Formats a date to a long localized string (weekday, day, month).
  * @param {Date} date - Date to format.
  * @returns {string} Localized long date string.
  */
  private formatDateLong(date: Date): string {
    return new Intl.DateTimeFormat('de-DE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    }).format(date);
  }

  /**
  * Automatically adjusts the height of a textarea to fit its content.
  * @param {HTMLTextAreaElement | null} el - Text area element to resize.
  */
  autoGrow(el: HTMLTextAreaElement | null) {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }

  /**
  * Converts text content to safe HTML including emoji icons.
  * @param {string} text - Raw message text.
  * @returns {SafeHtml} Sanitized HTML string with replaced emojis.
  */
  renderMessage(text: string): SafeHtml {
    if (!text) return '';
    const replaced = text.replace(/:([a-zA-Z0-9_+-]+):/g, (name) => {
      return `<img src="assets/reaction-icons/${name}.svg"
                  alt="${name}"
                  class="inline-smiley">`;
    });
    return this.sanitizer.bypassSecurityTrustHtml(replaced);
  }

  /**
  * Smoothly scrolls to a specific message in the view.
  * @param {string} messageId - ID of the target message.
  */
  scrollToMessage(messageId: string) {
    const chatRow = this.chatMessageRows
      .find(row => row.nativeElement.dataset['messageId'] === messageId)
      ?.nativeElement;
    if (chatRow) {
      chatRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
}

