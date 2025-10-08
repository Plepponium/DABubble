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

  addReaction(icon: string) {
    if (!this.messageId) return;
    this.addReactionEvent.emit({ messageId: this.messageId, icon });
  }


  toggleReactions() {
    this.toggleReactionsEvent.emit(this.messageId);
  }


  toggleEditDialog() {
    this.editDialogOpen = !this.editDialogOpen;
  }

  startEditing() {
    this.startEditEvent.emit(this.messageId);
    this.editDialogOpen = false;
  }

  saveEditedMessage() {
    if (!this.editedText.trim()) return;
    this.saveEditEvent.emit({ messageId: this.messageId, newText: this.editedText.trim() });
    this.isEditing = false;
  }

  cancelEditing() {
    this.isEditing = false;
    this.editedText = '';
  }
}
