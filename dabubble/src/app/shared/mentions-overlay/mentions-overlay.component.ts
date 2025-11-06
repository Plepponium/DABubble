import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, HostListener, Input, Output, QueryList, SimpleChanges, ViewChildren } from '@angular/core';
import { User } from '../../../models/user.class';

export type MentionContext = 'DM' | 'Channel' | 'Searchbar' | 'AddUser';

@Component({
  selector: 'app-mentions-overlay',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mentions-overlay.component.html',
  styleUrls: ['./mentions-overlay.component.scss']
})
export class MentionsOverlayComponent {

  @ViewChildren('mentionItem') mentionItems!: QueryList<ElementRef>;
  @Input() text = '';
  @Input() currentUserId?: string;
  @Input() context: MentionContext = 'DM';
  @Input() users: Partial<User>[] = [];
  @Input() channels: any[] = [];
  @Input() cursorPos!: number;

  @Output() mentionSelected = new EventEmitter<{ name: string, type: 'user' | 'channel' }>();
  @Output() overlayStateChange = new EventEmitter<boolean>();

  activeTrigger: '@' | '#' | null = null;
  searchTerm = '';
  filteredItems: any[] = [];
  activeIndex = 0;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['text']) {
      if (this.context === 'AddUser') {
        this.filterUsersDirectly();
      } else {
        this.detectTrigger();
      }
    }
  }

  private filterUsersDirectly() {
    const term = this.text.trim().toLowerCase();

    if (!term) {
      this.filteredItems = [];
      this.overlayStateChange.emit(false);
      return;
    }

    const sortedUsers = [...this.users].sort((a, b) =>
      (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase())
    );

    this.filteredItems = sortedUsers
      .filter(u => u.name?.toLowerCase().includes(term))
      .slice(0, 10);

    this.overlayStateChange.emit(this.filteredItems.length > 0);
  }

  private detectTrigger() {
    if (!this.text || this.cursorPos === undefined || this.cursorPos === null) {
      this.closeOverlay();
      this.overlayStateChange.emit(false);
      return;
    }
    // const match = this.text.match(/([@#])([^\s]*)$/);
    const subText = this.text.slice(0, this.cursorPos);
    const match = subText.match(/([@#])([^\s]*)$/);
    if (!match) {
      this.closeOverlay();
      this.overlayStateChange.emit(false);
      return;
    }
    this.activeTrigger = match[1] as '@' | '#';
    this.searchTerm = match[2].toLowerCase();

    if (this.activeTrigger === '@') {
      const sortedUsers = [...this.users].sort((a, b) =>
        (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase())
      );

      this.filteredItems = sortedUsers
        .filter(u => u.name?.toLowerCase().includes(this.searchTerm))
        .slice(0, 10);

    } else if (this.activeTrigger === '#') {
      this.filteredItems = this.channels
        .filter(c => c.name.toLowerCase().includes(this.searchTerm))
        .slice(0, 10);
    }

    if (this.filteredItems.length === 0) {
      this.closeOverlay();
      this.overlayStateChange.emit(false);
      return;
    }

    this.overlayStateChange.emit(true);
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
      this.scrollToActive();
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      this.activeIndex = (this.activeIndex - 1 + this.filteredItems.length) % this.filteredItems.length;
      this.scrollToActive();
      e.preventDefault();
    } else if (e.key === 'Enter') {
      this.select(this.filteredItems[this.activeIndex]);
      e.preventDefault();
    } else if (e.key === 'Escape') {
      this.closeOverlay();
      e.preventDefault();
    }
  }

  private scrollToActive() {
    const items = this.mentionItems.toArray();
    const el = items[this.activeIndex]?.nativeElement as HTMLElement;
    if (el) {
      el.scrollIntoView({ block: 'center' });
    }
  }
}
