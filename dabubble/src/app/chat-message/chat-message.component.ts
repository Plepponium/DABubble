import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ReactionsDisplayComponent } from '../reactions-display/reactions-display.component';
import { MentionsOverlayComponent } from '../shared/mentions-overlay/mentions-overlay.component';
import { Chat } from '../../models/chat.class';
import { User } from '../../models/user.class';
import { SafeHtml } from '@angular/platform-browser';
import { ChatsUiService } from '../../services/chats-ui.service';
import { ChatsTextService } from '../../services/chats-text.service';

@Component({
  selector: 'app-chat-message',
  imports: [CommonModule, FormsModule, ReactionsDisplayComponent, MentionsOverlayComponent],
  templateUrl: './chat-message.component.html',
  styleUrl: './chat-message.component.scss'
})
export class ChatMessageComponent {
  textService = inject(ChatsTextService);
  uiService = inject(ChatsUiService);
  
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
  @Output() addReaction = new EventEmitter<{ index: number; type: string }>();
  @Output() toggleReaction = new EventEmitter<{ index: number; type: string }>();
  @Output() openReactionsDialogue = new EventEmitter<{ index: number; below: boolean }>();
  @Output() enableEditChat = new EventEmitter<Chat>();
  @Output() cancelEditChat = new EventEmitter<Chat>();
  @Output() saveEditedChat = new EventEmitter<Chat>();

  /** Converts chat timestamp to JavaScript Date object. */
  getChatDate(chat: any): Date | undefined {
    return chat.time ? new Date(chat.time * 1000) : undefined;
  }

  /** Compares two dates to check if they fall on the same day. */
  isSameDate(d1: Date | undefined, d2: Date | undefined): boolean {
    if (!d1 || !d2) return false;
    return d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate();
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

  /** Dynamically adjusts textarea height to fit content. */
  autoGrow(el: HTMLTextAreaElement | null) {
    if (el) this.textService.autoGrow(el);
  }

  /** Renders message text with HTML sanitization and formatting. */
  renderMessage(text: string): SafeHtml {
    return this.textService.renderMessage(text);
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