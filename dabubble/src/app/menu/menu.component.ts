import { ChangeDetectorRef, ChangeDetectionStrategy, Component, signal, OnInit, Output, EventEmitter, inject, Input, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { RoundBtnComponent } from '../round-btn/round-btn.component';
import { UserService } from '../../services/user.service';
import { combineLatest, firstValueFrom, map, Observable } from 'rxjs';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { User } from '../../models/user.class';
import { ChannelService } from '../../services/channel.service';
import { Channel } from '../../models/channel.class';
import { MentionsOverlayComponent } from '../shared/mentions-overlay/mentions-overlay.component';
import { DirectMessageService } from '../../services/direct-messages.service';

@Component({
  selector: 'app-menu',
  imports: [CommonModule, MatIconModule, MatSidenavModule, MatButtonModule, MatToolbarModule, RoundBtnComponent, FormsModule, RouterModule, MentionsOverlayComponent],
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuComponent implements OnInit {
  readonly panelOpenState = signal(false);
  channelsExpanded = true;
  usersExpanded = true;
  showSearchHeader = false;

  searchText = '';
  caretIndex: number | null = null;
  overlayActive = false;
  inputFocused = false;
  private clickFromOverlay = false;

  messages: any[] = [];

  @Input() activeChannelId?: string;
  @Input() activeUserId?: string;
  @Input() users: any[] = [];
  @Input() channels: any[] = [];
  @Input() currentUser: User | undefined;

  @Output() openNewMessage = new EventEmitter<string>();
  @Output() openAddChannel = new EventEmitter<void>();
  @Output() openChannel = new EventEmitter<string>();
  @Output() openUserChat = new EventEmitter<User>();
  @Output() selectedItem = new EventEmitter<any>();

  userService = inject(UserService);
  channelService = inject(ChannelService);
  dmService = inject(DirectMessageService)
  cdr = inject(ChangeDetectorRef);

  currentUser$ = this.userService.getCurrentUser();
  users$ = this.userService.getUsers();

  sortedUsers$ = combineLatest([this.users$, this.currentUser$]).pipe(
    map(([users, currentUser]) => {
      if (!currentUser) return users;
      return [...users].sort((a, b) => {
        if (a.uid === currentUser.uid) return -1;
        if (b.uid === currentUser.uid) return 1;
        return 0;
      });
    })
  );

  ngOnInit() {
    this.updateSearchHeaderState();
  }

  private updateSearchHeaderState() {
    const text = this.searchText || '';
    const hasTrigger = text.startsWith('@') || text.startsWith('#');
    const hasTextSearch = text.length >= 3;
    this.showSearchHeader = (hasTrigger || hasTextSearch) && this.inputFocused;
    this.cdr.markForCheck();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['channels'] || changes['users'] || changes['currentUser']) {
      this.loadMessages();
      this.sortChannels();
      this.cdr.markForCheck();
    }
  }


  private async loadMessages() {
    if (!this.currentUser || !this.channels?.length || !this.users?.length) {
      this.messages = [];
      return;
    }

    this.messages = [];
    await this.loadChannelMessages();
    await this.loadDmMessages();
  }

  private async loadChannelMessages() {
    for (const ch of this.relevantChannels) {
      try {
        const chats = await firstValueFrom(this.channelService.getChatsForChannel(ch.id));
        const mapped = chats.map(c => {
          const sender = this.users.find(u => u.uid === c.user);
          return {
            type: 'channel-message',
            channelId: ch.id,
            channelName: ch.name,
            senderName: sender?.name || 'Unbekannt',
            participants: ch.participants,
            ...c
          };
        });
        this.messages.push(...mapped);
      } catch (error) {
        console.error('Fehler beim Laden von Channel-Nachrichten:', error);
      }
    }
  }

  private async loadDmMessages() {
    const dmIds = await this.dmService.getDmIdsForUser(this.currentUser!.uid);
    for (const dmId of dmIds) {
      const dmDoc = await firstValueFrom(this.dmService.getDmDoc(dmId));
      const dmMsgs = await firstValueFrom(this.dmService.getMessages(dmId));
      const mapped = dmMsgs.map(m => {
        const sender = this.users.find(u => u.uid === m.senderId);
        return {
          type: 'dm-message',
          dmId,
          participants: dmDoc.participants,
          senderName: sender?.name || 'Unbekannt',
          ...m
        };
      });
      this.messages.push(...mapped);
    }
  }

  get relevantChannels() {
    if (!this.currentUser) return [];
    return this.channels.filter(c => c.participants?.includes(this.currentUser?.uid));
  }

  private sortChannels() {
    this.channels.sort((a, b) => {
      const aDate = a.createdAt ? this.toDate(a.createdAt) : null;
      const bDate = b.createdAt ? this.toDate(b.createdAt) : null;
      if (!aDate && !bDate) return 0;
      if (!aDate) return -1;
      if (!bDate) return 1;
      return aDate.getTime() - bDate.getTime();
    });
  }

  private toDate(value: any): Date {
    if (value?.seconds) return new Date(value.seconds * 1000 + value.nanoseconds / 1e6);
    return new Date(value);
  }

  toggleChannels() {
    this.channelsExpanded = !this.channelsExpanded;
  }

  // trackByChannelId(index: number, channel: Channel): string {
  //   return channel.id;
  // }

  handleOpenNewMessage() {
    this.openNewMessage.emit()
  }

  handleOpenAddChannel(event: Event) {
    event.stopPropagation();
    this.openAddChannel.emit();
  }

  handleOpenChannel(channel: Channel) {
    this.activeChannelId = channel.id;
    this.activeUserId = '';
    this.openChannel.emit(channel.id);
  }

  toggleUsers() {
    this.usersExpanded = !this.usersExpanded;
  }

  handleOpenUserChat(user: User) {
    this.activeUserId = user.uid;
    this.activeChannelId = '';
    this.openUserChat.emit(user);
  }

  trackByUserId(index: number, user: User): string {
    return user.uid;
  }

  updateCaret(el: HTMLInputElement) {
    if (!el) return;
    this.caretIndex = el.selectionStart || 0;
    this.updateSearchHeaderState();
  }

  onNavigateToChat(item: any) {
    this.clickFromOverlay = true;
    this.searchText = '';
    this.selectedItem.emit(item);
    this.inputFocused = false;
    this.showSearchHeader = false;
    this.cdr.markForCheck();
  }

  onSearchFocus() {
    this.inputFocused = true;
    this.updateSearchHeaderState();
  }

  onSearchBlur() {
    setTimeout(() => {
      if (!this.clickFromOverlay) {
        this.inputFocused = false;
        this.showSearchHeader = false;
      }
      this.clickFromOverlay = false;
      this.cdr.markForCheck();
    }, 100);
  }

  clearSearch() {
    this.searchText = '';
    this.inputFocused = false;
    this.showSearchHeader = false;
    this.cdr.markForCheck();
  }

  onOverlayStateChange(active: boolean) {
    this.overlayActive = active;
    if (!active) {
      this.showSearchHeader = false;
    } else {
      this.updateSearchHeaderState();
    }
  }

}

