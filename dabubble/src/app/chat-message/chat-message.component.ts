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


  getChatDate(chat: any): Date | undefined {
    return chat.time ? new Date(chat.time * 1000) : undefined;
  }

  isSameDate(d1: Date | undefined, d2: Date | undefined): boolean {
    if (!d1 || !d2) return false;
    return d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate();
  }

  getDisplayDate(chat: any): string {
    return this.uiService.getDisplayDate(chat.time);
  }

  openEditCommentDialogue() {
    this.activeReactionDialogueIndex = null;
    this.editCommentDialogueExpanded = !this.editCommentDialogueExpanded;
  }

  updateEditCaret(chat: any, textarea: HTMLTextAreaElement) {
    chat._caretIndex = textarea.selectionStart;
  }

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

  onEnableEditChat(chat: any) {
    this.enableEditChat.emit(chat);
    this.editCommentDialogueExpanded = false;
  }

  onCancelEditChat(chat: any) {
    this.cancelEditChat.emit(chat);
  }

  onSaveEditedChat(chat: any) {
    this.saveEditedChat.emit(chat);
  }

  autoGrow(el: HTMLTextAreaElement | null) {
    if (el) this.textService.autoGrow(el);
  }

  renderMessage(text: string): SafeHtml {
    return this.textService.renderMessage(text);
  }

  handleOpenThread() {
    this.openThread.emit(this.chat.id);
  }

  handleOpenProfile() {
    this.openProfile.emit(this.chat);
  }
}