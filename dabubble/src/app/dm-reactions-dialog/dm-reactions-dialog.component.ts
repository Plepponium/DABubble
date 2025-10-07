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
  @Input() isOwnMessage = false;
  @Input() index!: number;
  @Input() reactionIcons: string[] = [];
  @Input() isOpen = false;

  @Output() addReactionEvent = new EventEmitter<{ messageId: string; icon: string }>();
  @Output() toggleReactionsEvent = new EventEmitter<string>();
  @Output() editMessageEvent = new EventEmitter<string>();

  addReaction(icon: string) {
    if (!this.messageId) return;
    this.addReactionEvent.emit({ messageId: this.messageId, icon });
  }


  toggleReactions() {
  this.toggleReactionsEvent.emit(this.messageId);
}


  editMessage() {
    if (!this.messageId) return;
    this.editMessageEvent.emit(this.messageId);
  }
}
