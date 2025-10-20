import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, HostListener, Input, Output, SimpleChanges } from '@angular/core';
import { User } from '../../../models/user.class';

export type MentionContext = 'DM' | 'Channel' | 'Searchbar';

@Component({
  selector: 'app-mentions-overlay',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mentions-overlay.component.html',
  styleUrls: ['./mentions-overlay.component.scss']
})
export class MentionsOverlayComponent {
  @Input() text = '';
  @Input() currentUser?: User;
  @Input() context: MentionContext = 'DM';
  @Input() users: Partial<User>[] = [];

  @Input() channels: any[] = [];
  @Output() mentionSelected = new EventEmitter<{ name: string, type: 'user' | 'channel' }>();

  activeTrigger: '@' | '#' | null = null;
  searchTerm = '';
  filteredItems: any[] = [];
  activeIndex = 0;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['text']) {
      this.detectTrigger();
    }
  }

  private detectTrigger() {
    const match = this.text.match(/([@#])([^\s]*)$/);
    if (!match) {
      this.closeOverlay();
      return;
    }
    this.activeTrigger = match[1] as '@' | '#';
    this.searchTerm = match[2].toLowerCase();

    if (this.activeTrigger === '@') {
      const sortedUsers = [...this.users].sort((a, b) => {
        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });

      this.filteredItems = sortedUsers
        .filter(u => u.name?.toLowerCase().includes(this.searchTerm))
        .slice(0, 10);

    } else if (this.activeTrigger === '#') {
      this.filteredItems = this.channels
        .filter(c => c.name.toLowerCase().includes(this.searchTerm))
        .slice(0, 10);
    }

    if (this.filteredItems.length === 0) this.closeOverlay();
  }


  private closeOverlay() {
    this.activeTrigger = null;
    this.filteredItems = [];
    this.activeIndex = 0;
  }

  select(item: any) {
    if (!item) return;
    this.mentionSelected.emit({
      name: item.name,
      type: this.activeTrigger === '@' ? 'user' : 'channel'
    });
    this.closeOverlay();
  }


  @HostListener('document:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent) {
    if (!this.filteredItems.length) return;

    if (e.key === 'ArrowDown') {
      this.activeIndex = (this.activeIndex + 1) % this.filteredItems.length;
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      this.activeIndex = (this.activeIndex - 1 + this.filteredItems.length) % this.filteredItems.length;
      e.preventDefault();
    } else if (e.key === 'Enter') {
      this.select(this.filteredItems[this.activeIndex]);
      e.preventDefault();
    } else if (e.key === 'Escape') {
      this.closeOverlay();
      e.preventDefault();
    }
  }
}
