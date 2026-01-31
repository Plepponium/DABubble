import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { ReactionIconsDialogComponent } from '../reaction-icons-dialog/reaction-icons-dialog.component';



@Component({
  selector: 'app-dm-reactions-dialog',
  templateUrl: './dm-reactions-dialog.component.html',
  styleUrls: ['./dm-reactions-dialog.component.scss'],
  imports: [CommonModule, ReactionIconsDialogComponent]
})
export class DmReactionsDialogComponent {
  @Input() messageId!: string;
  @Input() messageText = '';
  @Input() isOwnMessage = false;
  @Input() index!: number;
  @Input() reactionIcons: string[] = [];
  @Input() isOpen = false;
  @Output() addReactionEvent = new EventEmitter<{ messageId: string; icon: string }>();
  @Output() toggleReactionsEvent = new EventEmitter<string>();
  @Output() startEditEvent = new EventEmitter<string>();
  @Output() saveEditEvent = new EventEmitter<{ messageId: string; newText: string }>();

  editDialogOpen = false;
  isEditing = false;
  editedText = '';

  /**
  * Adds a reaction emoji to the message.
  * 
  * @param {string} icon - The emoji icon to add as a reaction
  */
  addReaction(icon: string) {
    if (!this.messageId) return;
    this.addReactionEvent.emit({ messageId: this.messageId, icon });
  }

  /**
  * Toggles the visibility of the reactions dialog.
  */
  toggleReactions() {
    this.toggleReactionsEvent.emit(this.messageId);
  }

  /**
  * Toggles the visibility of the edit dialog.
  */
  toggleEditDialog() {
    this.editDialogOpen = !this.editDialogOpen;
  }

  /**
  * Initiates the editing mode for the message.
  */
  startEditing() {
    this.startEditEvent.emit(this.messageId);
    this.editDialogOpen = false;
  }

  /**
  * Saves the edited message with the new text content. 
  * @returns {void}
  */
  saveEditedMessage() {
    if (!this.editedText.trim()) return;
    this.saveEditEvent.emit({ messageId: this.messageId, newText: this.editedText.trim() });
    this.isEditing = false;
  }

  /**
  * Cancels the editing mode and discards any changes.
  */
  cancelEditing() {
    this.isEditing = false;
    this.editedText = '';
  }
}
