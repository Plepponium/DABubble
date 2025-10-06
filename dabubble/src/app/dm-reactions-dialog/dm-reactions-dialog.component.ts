import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-dm-reactions-dialog',
  imports: [CommonModule],
  templateUrl: './dm-reactions-dialog.component.html',
  styleUrl: './dm-reactions-dialog.component.scss'
})
export class DmReactionsDialogComponent {
  @Input() messageId!: string;
  @Input() isOwnMessage = false;
  @Input() index!: number;
  @Input() reactionIcons: string[] = [];
  @Input() isOpen = false;

  @Output() addReactionEvent = new EventEmitter<{ icon: string; messageId: string }>();
  @Output() toggleReactionsEvent = new EventEmitter<string>();
  @Output() editMessageEvent = new EventEmitter<string>();

  addReaction(icon: string) {
    this.addReactionEvent.emit({ icon, messageId: this.messageId });
  }

  toggleReactions() {
    this.toggleReactionsEvent.emit(this.messageId);
  }


  editMessage() {
    this.editMessageEvent.emit(this.messageId);
  }
}
