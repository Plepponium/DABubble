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

  // State, der vorher in ChatsComponent lag:
  @Input() activeReactionDialogueIndex: number | null = null;
  @Input() activeReactionDialogueBelowIndex: number | null = null;
  @Input() showAllReactions: { [index: number]: boolean } = {};

  @Output() addReaction = new EventEmitter<{ index: number; type: string }>();
  @Output() toggleReaction = new EventEmitter<{ index: number; type: string }>();
  @Output() openReactionsDialogue = new EventEmitter<{ index: number; below: boolean }>();
  @Output() showAllReactionsChange = new EventEmitter<{ index: number; showAll: boolean }>();

  get isOwnMessage(): boolean {
    return this.chat.user === this.currentUserId;
  }

  // getMaxReactionsToShow(): any[] {
  //   const max = this.isResponsive ? 3 : 7;
  //   const showAll = this.showAllReactions[this.index];
  //   return showAll ? this.chat.reactionArray : this.chat.reactionArray.slice(0, max);
  // }
  getMaxReactionsToShow(): any[] {
    const reactionArray = this.chat.reactionArray ?? [];  // ✅ Fallback
    const max = this.isResponsive ? 3 : 7;
    const showAll = this.showAllReactions[this.index];
    return showAll ? reactionArray : reactionArray.slice(0, max);
  }

  onAddReaction(type: string, below: boolean | null = null) {
    this.addReaction.emit({ index: this.index, type });
    if (below !== null) {
      this.openReactionsDialogue.emit({ index: this.index, below });
    }
  }

  onToggleReaction(type: string) {
    this.toggleReaction.emit({ index: this.index, type });
  }

  onOpenReactionsDialogue(below: boolean) {
    this.openReactionsDialogue.emit({ index: this.index, below });
  }

  showAll() {
    this.showAllReactionsChange.emit({ index: this.index, showAll: true });
  }

  showLess() {
    this.showAllReactionsChange.emit({ index: this.index, showAll: false });
  }
}
