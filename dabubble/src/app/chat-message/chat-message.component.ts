import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ReactionsDisplayComponent } from '../reactions-display/reactions-display.component';
import { MentionsOverlayComponent } from '../shared/mentions-overlay/mentions-overlay.component';
import { Chat } from '../../models/chat.class';
import { User } from '../../models/user.class';
import { SafeHtml } from '@angular/platform-browser';
import { ChatsUiService } from '../../services/chats-ui.service';
import { ChatsTextService } from '../../services/chats-text.service';
import { SmileyOverlayComponent } from '../shared/smiley-overlay/smiley-overlay.component';
import { RoundBtnComponent } from '../round-btn/round-btn.component';
import { reactionIcons } from '../reaction-icons';
import { takeUntil } from 'rxjs/internal/operators/takeUntil';
import { take } from 'rxjs/internal/operators/take';
import { ChatsDataService } from '../../services/chats-data.service';
import { Subject } from 'rxjs/internal/Subject';

@Component({
  selector: 'app-chat-message',
  imports: [CommonModule, FormsModule, ReactionsDisplayComponent, MentionsOverlayComponent, SmileyOverlayComponent, RoundBtnComponent],
  templateUrl: './chat-message.component.html',
  styleUrl: './chat-message.component.scss'
})
export class ChatMessageComponent {
  @Input() chat!: Chat;
  @Input() index!: number;
  @Input() currentUserId!: string;
  @Input() isResponsive!: boolean;
  @Input() participants!: User[];
  @Input() filteredChannels!: any[];
  @Input() activeReactionDialogueIndex!: number | null;
  @Input() activeReactionDialogueBelowIndex!: number | null;
  @Input() showAllReactions!: { [index: number]: boolean };
  @Input() editCommentDialogueExpanded!: boolean;
  @Input() reactionIcons: string[] = [];
  @Input() prevChatDate?: Date;
  @Output() openThread = new EventEmitter<string>();
  @Output() openProfile = new EventEmitter<Chat>();
  @Output() openUserChat = new EventEmitter<User>();
  @Output() openChannel = new EventEmitter<string>();
  @Output() addReaction = new EventEmitter<{ index: number; type: string }>();
  @Output() toggleReaction = new EventEmitter<{ index: number; type: string }>();
  @Output() openReactionsDialogue = new EventEmitter<{ index: number; below: boolean }>();
  @Output() enableEditChat = new EventEmitter<Chat>();
  @Output() cancelEditChat = new EventEmitter<Chat>();
  @Output() saveEditedChat = new EventEmitter<Chat>();

  textService = inject(ChatsTextService);
  uiService = inject(ChatsUiService);
  dataService = inject(ChatsDataService);
  cdr = inject(ChangeDetectorRef);

  editSmileyActive: { [key: string]: boolean } = {};
  allSmileys = reactionIcons;
  private allUsers: Record<string, User> = {};
  private destroy$ = new Subject<void>();

  /** Initializes the component and loads all users. */
  ngOnInit() {
    this.dataService.allUsers$.pipe(
      take(1),
      takeUntil(this.destroy$)
    ).subscribe(usersMap => {
      this.allUsers = usersMap;
      this.cdr.markForCheck();
    });
  }

  /** Cleans up subscriptions on component destruction. */
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Converts chat timestamp to JavaScript Date object. */
  getChatDate(chat: any): Date | undefined {
    return chat.time ? new Date(chat.time * 1000) : undefined;
  }

  /** Compares two dates to check if they fall on the same day. */
  isSameDate(d1: Date | undefined, d2: Date | undefined): boolean {
    if (!d1 || !d2) return false;
    return this.uiService.isSameDate(d1, d2);
  }

  /** Formats chat timestamp for display using UI service. */
  getDisplayDate(chat: any): string {
    return this.uiService.getDisplayDate(chat.time);
  }

  /** Toggles edit comment dialogue and closes active reaction dialogues. */
  openEditCommentDialogue() {
    this.activeReactionDialogueIndex = null;
    this.editCommentDialogueExpanded = !this.editCommentDialogueExpanded;
  }

  /** Updates caret position tracking for message editing. */
  updateEditCaret(chat: any, textarea: HTMLTextAreaElement) {
    chat._caretIndex = textarea.selectionStart;
  }

  /** Inserts @mention or #channel reference into edited message at cursor position. */
  insertMentionInEdit(chat: any, event: { name: string; type: 'user' | 'channel' | 'email' }) {
    const trigger = event.type === 'user' ? '@' : '#';
    const mentionText = `${trigger}${event.name} `;

    const pos = chat._caretIndex ?? chat.editedText.length;
    const before = chat.editedText.slice(0, pos);
    const replaced = before.replace(/([@#])([^\s]*)$/, mentionText);

    chat.editedText = replaced + ' ' + chat.editedText.slice(pos);
    chat._caretIndex = replaced.length + 1;

    setTimeout(() => {
      const textarea = document.getElementById(`edit-${chat.id}`) as HTMLTextAreaElement;
      textarea?.focus();
      textarea && (textarea.selectionStart = textarea.selectionEnd = chat._caretIndex);
    });
  }

  /** Emits event to enable edit mode and closes edit dialogue. */
  onEnableEditChat(chat: any) {
    this.enableEditChat.emit(chat);
    this.editCommentDialogueExpanded = false;
  }

  /** Emits event to cancel message editing. */
  onCancelEditChat(chat: any) {
    this.cancelEditChat.emit(chat);
  }

  /** Emits event to save edited message content. */
  onSaveEditedChat(chat: any) {
    this.saveEditedChat.emit(chat);
  }

  /** Toggles smiley overlay for chat, closing others. */
  toggleEditSmiley(chatId: string): void {
    this.editSmileyActive[chatId] = !this.editSmileyActive[chatId];
    Object.keys(this.editSmileyActive).forEach(id => {
      if (id !== chatId) this.editSmileyActive[id] = false;
    });
  }

  /** Inserts emoji at textarea cursor position and closes overlay. */
  insertSmileyInEdit(chat: any, emoji: string, textarea: HTMLTextAreaElement): void {
    const caretPos = textarea.selectionStart || 0;
    chat.editedText = chat.editedText.slice(0, caretPos) + `:${emoji}:` + chat.editedText.slice(caretPos);
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = caretPos + emoji.length + 2;
      this.updateEditCaret(chat, textarea);
    });
    this.editSmileyActive[chat.id] = false;
  }

  /** Dynamically adjusts textarea height to fit content. */
  autoGrow(el: HTMLTextAreaElement | null) {
    if (el) this.textService.autoGrow(el);
  }

  /** Renders message text with emojis and mentions using text service. */
  renderMessage(text: string): SafeHtml {
    return this.textService.renderMessage(text, this.allUsers, this.filteredChannels);
  }


  onMentionClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    this.textService.handleMentionClick(target,
      (user) => this.openUserChat.emit(user),
      (channelId) => this.openChannel.emit(channelId)
    );
  }


  /** Emits event to open thread for current chat message. */
  handleOpenThread() {
    this.openThread.emit(this.chat.id);
  }

  /** Emits event to open user profile for message author. */
  handleOpenProfile() {
    this.openProfile.emit(this.chat);
  }
}