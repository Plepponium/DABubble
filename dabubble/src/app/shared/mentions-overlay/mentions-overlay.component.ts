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
  @Input() source: 'default' | 'menu' = 'default';
  @Output() mentionSelected = new EventEmitter<{ name: string, type: 'user' | 'channel' | 'email' }>();
  @Output() overlayStateChange = new EventEmitter<boolean>();
  @Output() navigateToChat = new EventEmitter<any>();

  activeTrigger: '@' | '#' | null = null;
  searchTerm = '';
  filteredItems: any[] = [];
  activeIndex = 0;

  private isOverlayActive = false;

  /** Handles text/caret changes by context-specific filtering. */
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

  /** Filters users directly by name for AddUser context. */
  private filterUsersDirectly() {
    const term = this.text.trim().toLowerCase();
    if (!term) {
      this.filteredItems = [];
      this.overlayStateChange.emit(false);
      return;
    }
    const sortedUsers = this.sortUsersAlphabetically(this.users);
    this.filteredItems = this.filterUsersByTerm(sortedUsers, term).slice(0, 10);
    this.updateOverlayState();
  }

  private sortUsersAlphabetically(users: Partial<User>[]): Partial<User>[] {
    return [...users].sort((a, b) =>
      (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase())
    );
  }

  private filterUsersByTerm(users: Partial<User>[], term: string): Partial<User>[] {
    return users.filter(u => u.name?.toLowerCase().includes(term));
  }

  private updateOverlayState() {
    this.isOverlayActive = this.filteredItems.length > 0;
    this.overlayStateChange.emit(this.isOverlayActive);
  }

  /** Filters recipient users/emails for AddRecipient context. */
  private filterRecipientUsers() {
    const textBeforeCaret = this.getTextBeforeCaret();
    const triggerMatch = /([@#])([^\s]*)$/.exec(textBeforeCaret);
    if (triggerMatch) {
      this.setTriggerAndSearch(triggerMatch);
      this.detectTrigger();
      return;
    }
    if (this.hasTrailingSpaceWithAt(textBeforeCaret)) {
      this.closeOverlay();
      return;
    }
    const clean = this.getLastToken(textBeforeCaret).toLowerCase();
    if (clean.length < 1) {
      this.closeOverlay();
      return;
    }
    this.filteredItems = this.filterAvailableEmails(this.users, clean).slice(0, 10);
    this.activeTrigger = null;
    this.updateOverlayState();
  }

  private getTextBeforeCaret(): string {
    return typeof this.caretIndex === 'number' ? this.text.slice(0, this.caretIndex) : this.text;
  }

  private setTriggerAndSearch(match: RegExpExecArray) {
    this.activeTrigger = match[1] as '@' | '#';
    this.searchTerm = match[2].toLowerCase();
  }

  private hasTrailingSpaceWithAt(text: string): boolean {
    return text.includes('@') && text.endsWith(' ');
  }

  private getLastToken(text: string): string {
    const lastTokenMatch = text.match(/([^\s]+)$/);
    return lastTokenMatch ? lastTokenMatch[1] : '';
  }

  private filterAvailableEmails(users: Partial<User>[], clean: string): any[] {
    const { names: selectedNames, emails: selectedEmails } = this.getSelectedNames();
    return users.filter(u => {
      const email = u.email?.toLowerCase();
      const name = u.name?.toLowerCase();
      if (!email || !email.includes(clean)) return false;
      if (selectedEmails.has(email) || (name && selectedNames.has(name))) return false;
      return true;
    });
  }

  /** Filters messages for Searchbar context. */
  private filterSearchbar() {
    const textToCheck = this.getTextBeforeCaret();
    const match = textToCheck.match(/([@#])([^\s]*)$/);
    if (match) {
      this.detectTrigger();
      return;
    }
    this.activeTrigger = null;
    const term = this.text.trim().toLowerCase();
    if (!term || term.length < 3) {
      this.closeOverlay();
      return;
    }
    this.filteredItems = this.filterMessagesByTerm(term).slice(0, 20);
    this.updateOverlayState();
    if (!this.filteredItems.length) this.closeOverlay();
  }

  private filterMessagesByTerm(term: string): any[] {
    return this.messages.filter(m =>
      (m.type === 'channel-message' && m.message?.toLowerCase().includes(term)) ||
      (m.type === 'dm-message' && m.text?.toLowerCase().includes(term))
    );
  }



  /** Detects @/# trigger and filters users/channels accordingly. */
  private detectTrigger() {
    const textToCheck = this.getTextBeforeCaret();
    const match = textToCheck.match(/([@#])([^\s]*)$/);
    if (!match) {
      this.closeOverlay();
      return;
    }
    this.activeTrigger = match[1] as '@' | '#';
    this.searchTerm = match[2].toLowerCase();
    if (this.activeTrigger === '@') {
      this.filterUsersWithTrigger();
    } else {
      this.filterChannelsWithTrigger();
    }
    this.updateOverlayState();
  }

  private filterUsersWithTrigger() {
    const { names: selectedNames, emails: selectedEmails } = this.getSelectedNames();
    const sortedUsers = this.sortUsersAlphabetically(this.users);
    this.filteredItems = sortedUsers
      .filter(u => this.matchesUserCriteria(u, this.searchTerm, selectedNames, selectedEmails))
      .slice(0, 10);
  }

  private filterChannelsWithTrigger() {
    const { names: selectedNames } = this.getSelectedNames();
    this.filteredItems = this.channels
      .filter(c => {
        const name = c.name.toLowerCase();
        if (selectedNames.has(name)) return false;
        if (this.searchTerm && !name.includes(this.searchTerm)) return false;
        return true;
      })
      .slice(0, 10);
  }

  private matchesUserCriteria(u: Partial<User>, term: string, selectedNames: Set<string>, selectedEmails: Set<string>): boolean {
    const name = u.name?.toLowerCase();
    const email = u.email?.toLowerCase();
    if (!name && !email) return false;
    if (name && selectedNames.has(name)) return false;
    if (email && selectedEmails.has(email)) return false;
    if (term) {
      const matchesName = name?.includes(term);
      const matchesEmail = email?.includes(term);
      if (!matchesName && !matchesEmail) return false;
    }
    return true;
  }


  // -------------------------------------------------------------------------------------------------------------------//

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

  private getSelectedNames(): { names: Set<string>, emails: Set<string> } {
    const names = new Set<string>();
    const emails = new Set<string>();

    if (this.context !== 'AddRecipient') {
      return { names, emails };
    }

    // 1. @Mentions - NUR bis zum nächsten Leerzeichen
    const userMentionRegex = /@([a-zA-ZÀ-ÿ0-9._-]+(?:\s+[a-zA-ZÀ-ÿ0-9._-]+)?)(?=\s|$)/g;
    let match: RegExpExecArray | null;
    while ((match = userMentionRegex.exec(this.text)) !== null) {
      const mentionedName = match[1].toLowerCase().trim();
      names.add(mentionedName);
    }

    // 2. #Channels - NUR bis zum nächsten Leerzeichen
    const channelMentionRegex = /#([a-zA-ZÀ-ÿ0-9._-]+)(?=\s|$)/g;
    while ((match = channelMentionRegex.exec(this.text)) !== null) {
      const channelName = match[1].toLowerCase();
      names.add(channelName);
    }

    // 3. ECHTE E-Mails - NUR Tokens ohne @/# am Anfang + gültiges Email-Format
    this.text
      .split(/\s+/)
      .filter(t => {
        const clean = t.toLowerCase().trim();
        return clean.includes('@') &&
          !clean.startsWith('@') &&
          !clean.startsWith('#') &&
          clean.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      })
      .forEach(token => {
        const clean = token.toLowerCase().trim();
        emails.add(clean);
      });

    return { names, emails };
  }

  private closeOverlay() {
    this.isOverlayActive = false;
    this.activeTrigger = null;
    this.filteredItems = [];
    this.activeIndex = 0;
    this.overlayStateChange.emit(false);
  }

  onItemClick(item: any) {
    if (!item) return;
    this.navigateToChat.emit(item);
    this.closeOverlay();
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent) {
    if (!this.isOverlayActive || !this.filteredItems.length) return;
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
