import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, HostListener, ElementRef, inject } from '@angular/core';

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

  private elementRef = inject(ElementRef<HTMLElement>);

  /** Adds a reaction to the message and emits the event. */
  addReaction(icon: string) {
    if (!this.messageId) return;
    this.addReactionEvent.emit({ messageId: this.messageId, icon });
    this.toggleEvent.emit(this.messageId);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.isOpen) return;
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const clickedInside = this.elementRef.nativeElement.contains(target);
    if (!clickedInside) {
      this.toggleEvent.emit(this.messageId);
    }
  }
}
