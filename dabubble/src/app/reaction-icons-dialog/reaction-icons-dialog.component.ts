import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-reaction-icons-dialog',
  templateUrl: './reaction-icons-dialog.component.html',
  styleUrls: ['./reaction-icons-dialog.component.scss'],
  imports: [CommonModule]
})
export class ReactionIconsDialogComponent {
  @Input() reactionIcons: string[] = [];
  @Input() isOpen = false;
  @Input() messageId!: string;
  @Input() position: 'left' | 'right' = 'right';
  @Input() source: 'chat' | 'hover' = 'chat';


  @Output() addReactionEvent = new EventEmitter<{ messageId: string; icon: string }>();
  @Output() toggleEvent = new EventEmitter<string>();

  addReaction(icon: string) {
    if (!this.messageId) return;
    this.addReactionEvent.emit({ messageId: this.messageId, icon });
    this.toggleEvent.emit(this.messageId);
  }
}
