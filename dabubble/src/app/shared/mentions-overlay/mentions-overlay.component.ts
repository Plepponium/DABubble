import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, HostListener, Input, Output, QueryList, SimpleChanges, ViewChildren } from '@angular/core';
import { User } from '../../../models/user.class';

export type MentionContext = 'DM' | 'Channel' | 'Searchbar' | 'AddUser' | 'AddRecipient';

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
  @Input() caretIndex?: number | null;
  @Input() currentUserId?: string;
  @Input() context: MentionContext = 'DM';
  @Input() users: Partial<User>[] = [];
  @Input() channels: any[] = [];
  @Input() messages: any[] = [];


  @Output() mentionSelected = new EventEmitter<{ name: string, type: 'user' | 'channel' | 'email' }>();
  @Output() overlayStateChange = new EventEmitter<boolean>();
  @Output() navigateToChat = new EventEmitter<any>();

  activeTrigger: '@' | '#' | null = null;
  searchTerm = '';
  filteredItems: any[] = [];
  activeIndex = 0;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['text'] || changes['caretIndex']) {
      if (this.context === 'AddUser') {
        this.filterUsersDirectly();
        return;
      }
      if (this.context === 'AddRecipient') {
        this.filterRecipientUsers();
        return;
      }
      if (this.context === 'Searchbar') {
        this.filterSearchbar();
        return;
      }
      this.detectTrigger();
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

  private filterRecipientUsers() {
    const textBeforeCaret =
      typeof this.caretIndex === 'number'
        ? this.text.slice(0, this.caretIndex)
        : this.text;
    const lastTokenMatch = textBeforeCaret.match(/([^\s]+)$/);
    const lastToken = lastTokenMatch ? lastTokenMatch[1] : "";
    const triggerMatch = textBeforeCaret.match(/([@#])([^\s]*)$/);
    if (triggerMatch) {
      this.activeTrigger = triggerMatch[1] as '@' | '#';
      this.searchTerm = triggerMatch[2].toLowerCase();
      this.detectTrigger();
      return;
    }
    if (lastToken.includes("@") && textBeforeCaret.endsWith(" ")) {
      this.filteredItems = [];
      this.overlayStateChange.emit(false);
      return;
    }
    const clean = lastToken.toLowerCase();
    if (clean.length < 1) {
      this.filteredItems = [];
      this.overlayStateChange.emit(false);
      return;
    }
    const selected = this.getSelectedNames();
    this.filteredItems = [...this.users]
      .filter(u => {
        const email = u.email?.toLowerCase();
        const name = u.name?.toLowerCase();
        if (!email) return false;
        if (!email.includes(clean)) return false;
        if (selected.has(email) || (name && selected.has(name))) return false;
        return true;
      })
      .slice(0, 10);
    this.activeTrigger = null;
    this.overlayStateChange.emit(this.filteredItems.length > 0);
  }




  private filterSearchbar() {
    const textToCheck = typeof this.caretIndex === 'number'
      ? this.text.slice(0, this.caretIndex)
      : this.text;
    const match = textToCheck.match(/([@#])([^\s]*)$/);
    if (match) {
      this.detectTrigger();
      return;
    }
    this.activeTrigger = null;
    const term = this.text.trim().toLowerCase();
    if (!term || term.length < 3) {
      this.filteredItems = [];
      this.closeOverlay();
      this.overlayStateChange.emit(false);
      return;
    }
    this.filteredItems = this.messages
      .filter(m =>
        (m.type === 'channel-message' && m.message?.toLowerCase().includes(term)) ||
        (m.type === 'dm-message' && m.text?.toLowerCase().includes(term))
      )
      .slice(0, 20);
    this.overlayStateChange.emit(this.filteredItems.length > 0);
    if (!this.filteredItems.length) {
      this.closeOverlay();
      this.overlayStateChange.emit(false);
    }
  }




  private detectTrigger() {
    const textToCheck = (typeof this.caretIndex === 'number')
      ? this.text.slice(0, this.caretIndex)
      : this.text;
    const match = textToCheck.match(/([@#])([^\s]*)$/);
    if (!match) {
      this.closeOverlay();
      this.overlayStateChange.emit(false);
      return;
    }
    this.activeTrigger = match[1] as '@' | '#';
    this.searchTerm = match[2].toLowerCase();
    if (this.activeTrigger === '@') {
      const selected = this.getSelectedNames();

      const sortedUsers = [...this.users].sort((a, b) =>
        (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase())
      );

      this.filteredItems = sortedUsers
        .filter(u => {
          const name = u.name?.toLowerCase();
          if (!name) return false;
          if (selected.has(name)) return false;
          if (this.searchTerm && !name.includes(this.searchTerm)) return false;
          return true;
        })
        .slice(0, 10);
    }
    else if (this.activeTrigger === '#') {
      const selected = this.getSelectedNames();
      this.filteredItems = this.channels
        .filter(c => {
          const name = c.name.toLowerCase();
          if (selected.has(name)) return false;
          if (this.searchTerm && !name.includes(this.searchTerm)) return false;
          return true;
        })
        .slice(0, 10);
    }
  }

  select(item: any) {
    if (this.context === 'Searchbar') {
      this.navigateToChat.emit(item);
      this.closeOverlay();
      return;
    }
    if (!item) return;
    let valueToInsert = item.name;
    let type: 'email' | 'user' | 'channel' = this.activeTrigger === '@' ? 'user' : 'channel';
    if (this.context === 'AddRecipient' && !this.activeTrigger) {
      valueToInsert = item.email;
      type = 'email';
    }
    this.mentionSelected.emit({
      name: valueToInsert,
      type: type
    });
    this.closeOverlay();
  }

  private getSelectedNames(): Set<string> {
    if (this.context !== 'AddRecipient') return new Set();
    const result = new Set<string>();
    const mentionRegex = /[@#]([a-zA-ZÀ-ÿ0-9._-]+(?:\s+[a-zA-ZÀ-ÿ0-9._-]+)*)/g;
    let match: RegExpExecArray | null;
    while ((match = mentionRegex.exec(this.text)) !== null) {
      result.add(match[1].toLowerCase());
    }
    this.text
      .split(/\s+/)
      .filter(t => t.includes('@') && !t.startsWith('@'))
      .forEach(email => result.add(email.toLowerCase()));
    return result;
  }




  private closeOverlay() {
    this.activeTrigger = null;
    this.filteredItems = [];
    this.activeIndex = 0;
  }

  onItemClick(item: any) {
    if (!item) return;
    console.log('Item clicked:', item);
    this.navigateToChat.emit(item);
    this.closeOverlay();
  }


  @HostListener('document:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent) {
    if (!this.filteredItems.length) return;
    if (e.key === 'ArrowDown') {
      this.activeIndex = (this.activeIndex + 1) % this.filteredItems.length;
      this.scrollToActive();
      e.preventDefault();
      e.stopPropagation();
    }
    else if (e.key === 'ArrowUp') {
      this.activeIndex = (this.activeIndex - 1 + this.filteredItems.length) % this.filteredItems.length;
      this.scrollToActive();
      e.preventDefault();
      e.stopPropagation();
    }
    else if (e.key === 'Enter') {
      const item = this.filteredItems[this.activeIndex];
      if (this.context === 'Searchbar') {
        this.onItemClick(item);
      } else {
        this.select(item);
      }
      e.preventDefault();
      e.stopPropagation();
    }
    else if (e.key === 'Escape') {
      this.closeOverlay();
      e.preventDefault();
      e.stopPropagation();
    }
  }

  private scrollToActive() {
    const items = this.mentionItems.toArray();
    const el = items[this.activeIndex]?.nativeElement as HTMLElement;
    if (el) {
      el.scrollIntoView({ block: 'nearest' });
    }
  }
}
