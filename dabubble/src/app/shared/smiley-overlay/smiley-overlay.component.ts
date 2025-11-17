import { Component, ElementRef, EventEmitter, HostListener, Input, Output, QueryList, SimpleChanges, ViewChildren } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MentionContext } from '../mentions-overlay/mentions-overlay.component';
import { User } from '../../../models/user.class';

@Component({
  selector: 'app-smiley-overlay',
  imports: [CommonModule],
  templateUrl: './smiley-overlay.component.html',
  styleUrl: './smiley-overlay.component.scss'
})
export class SmileyOverlayComponent {
  // @ViewChildren('mentionSmiley') mentionItems!: QueryList<ElementRef>;
  // @Input() text = '';
  // @Input() caretIndex?: number | null;
  // @Input() context: MentionContext = 'DM';
  // // @Input() users: Partial<User>[] = [];
  // // @Input() channels: any[] = [];
  // @Input() cursorPos!: number;

  // @Output() smileySelected = new EventEmitter<{ name: string }>();
  // @Output() overlayStateChange = new EventEmitter<boolean>();

  @Input() emojis: string[] = [];       // z.B. ['check', 'glasses', ...]
  @Input() active = false;              // Wird vom Parent gesteuert
  @Output() selected = new EventEmitter<string>();
  @Output() activeChange = new EventEmitter<boolean>();

  // activeSmiley: true;
  // // searchTerm = '';
  // filteredItems: any[] = [];
  // activeIndex = 0;

  filteredItems: string[] = [];
  activeIndex = 0;

  ngOnChanges() {
    if (this.active) {
      this.filteredItems = [...this.emojis];
      this.activeIndex = 0;
    }
  }

  select(smiley: string) {
    this.selected.emit(smiley);
    this.close();
  }

  close() {
    this.active = false;
    this.activeChange.emit(false);
  }

  @HostListener('document:click', ['$event'])
  onDocClick(event: Event) {
    if (!this.active) return;

    const inside = (event.target as HTMLElement).closest('.smiley-overlay');
    if (!inside) {
      this.close();
    }
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent) {
    if (!this.active) return;

    if (e.key === 'Escape') {
      this.close();
      e.preventDefault();
    }
    if (e.key === 'Enter') {
      this.select(this.filteredItems[this.activeIndex]);
      e.preventDefault();
    }
    if (e.key === 'ArrowDown') {
      this.activeIndex = (this.activeIndex + 1) % this.filteredItems.length;
      e.preventDefault();
    }
    if (e.key === 'ArrowUp') {
      this.activeIndex = (this.activeIndex - 1 + this.filteredItems.length) % this.filteredItems.length;
      e.preventDefault();
    }
  }
}