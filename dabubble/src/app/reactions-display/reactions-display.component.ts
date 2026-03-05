import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chat } from '../../models/chat.class';
import { RoundBtnComponent } from '../round-btn/round-btn.component';
import { reactionIcons } from '../reaction-icons';

@Component({
  selector: 'app-reactions-display',
  imports: [CommonModule, RoundBtnComponent],
  templateUrl: './reactions-display.component.html',
  styleUrl: './reactions-display.component.scss'
})
export class ReactionsDisplayComponent {
  @Input() chat!: Chat;
  @Input() index!: number;
  @Input() currentUserId!: string;
  @Input() isResponsive: boolean = false;
  @Input() reactionIcons: string[] = reactionIcons;
  @Input() activeReactionDialogueIndex: number | null = null;
  @Input() activeReactionDialogueBelowIndex: number | null = null;
  @Input() showAllReactions: { [index: number]: boolean } = {};
  @Output() addReaction = new EventEmitter<{ index: number; type: string }>();
  @Output() toggleReaction = new EventEmitter<{ index: number; type: string }>();
  @Output() openReactionsDialogue = new EventEmitter<{ index: number; below: boolean }>();
  @Output() showAllReactionsChange = new EventEmitter<{ index: number; showAll: boolean }>();

  // Check if the current user is the author of the message
  get isOwnMessage(): boolean {
    return this.chat.user === this.currentUserId;
  }

  /** Returns reactions to display based on responsive state. */
  getMaxReactionsToShow(): any[] {
    const reactionArray = this.chat.reactionArray ?? [];
    const max = this.isResponsive ? 3 : 7;
    const showAll = this.showAllReactions[this.index];
    return showAll ? reactionArray : reactionArray.slice(0, max);
  }

  /** Emits add reaction event and optionally opens dialogue. */
  onAddReaction(type: string, below: boolean | null = null) {
    this.addReaction.emit({ index: this.index, type });
    if (below !== null) {
      this.openReactionsDialogue.emit({ index: this.index, below });
    }
  }

  /** Emits toggle reaction event for given type. */
  onToggleReaction(type: string) {
    this.toggleReaction.emit({ index: this.index, type });
  }

  /** Emits open reactions dialogue event. */
  onOpenReactionsDialogue(below: boolean) {
    this.openReactionsDialogue.emit({ index: this.index, below });
  }

  /** Emits event to show all reactions. */
  showAll() {
    this.showAllReactionsChange.emit({ index: this.index, showAll: true });
  }

  /** Emits event to show fewer reactions. */
  showLess() {
    this.showAllReactionsChange.emit({ index: this.index, showAll: false });
  }
}
