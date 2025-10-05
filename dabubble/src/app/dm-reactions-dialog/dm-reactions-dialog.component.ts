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
  @Input() activeReactionDialogueIndex!: number | null;
  @Input() index!: number;
  @Input() reactionIcons: string[] = [];   // Standard-Reactions

  @Output() addReactionEvent = new EventEmitter<{ messageId: string, icon: string }>();

  @Output() openReactionsEvent = new EventEmitter<number>();
  @Output() editMessageEvent = new EventEmitter<string>();

  addReaction(icon: string) {
    this.addReactionEvent.emit({ messageId: this.messageId, icon });
  }


  openReactions() {
    this.openReactionsEvent.emit(this.index);
  }

  editMessage() {
    this.editMessageEvent.emit(this.messageId);
  }
}
