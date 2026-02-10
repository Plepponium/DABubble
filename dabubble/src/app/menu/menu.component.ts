import { ChangeDetectorRef, ChangeDetectionStrategy, Component, signal, OnInit, Output, EventEmitter, inject, Input, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { RoundBtnComponent } from '../round-btn/round-btn.component';
import { UserService } from '../../services/user.service';
import { combineLatest, firstValueFrom, map } from 'rxjs';
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

  readonly panelOpenState = signal(false);
  channelsExpanded = true;
  usersExpanded = true;
  showSearchHeader = false;
  searchText = '';
  caretIndex: number | null = null;
  overlayActive = false;
  inputFocused = false;
  private clickFromOverlay = false;

  userService = inject(UserService);
  channelService = inject(ChannelService);
  dmService = inject(DirectMessageService)
  cdr = inject(ChangeDetectorRef);

  messages: any[] = [];
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

  /** Initializes search header state based on input focus and text length. */
  ngOnInit() {
    this.updateSearchHeaderState();
  }

  /**
  * Updates search header visibility based on trigger chars, length and focus.
  */
  private updateSearchHeaderState() {
    const text = this.searchText || '';
    const hasTrigger = text.startsWith('@') || text.startsWith('#');
    const hasTextSearch = text.length >= 3;
    this.showSearchHeader = (hasTrigger || hasTextSearch) && this.inputFocused;
    this.cdr.markForCheck();
  }

  /**
  * Handles input changes for channels, users, currentUser by loading messages.
  */
  ngOnChanges(changes: SimpleChanges) {
    if (changes['channels'] || changes['users'] || changes['currentUser']) {
      this.loadMessages();
      this.sortChannels();
      this.cdr.markForCheck();
    }
  }

  /**
  * Loads and combines channel and DM messages for current user.
  */
  private async loadMessages() {
    if (!this.currentUser || !this.channels?.length || !this.users?.length) {
      this.messages = [];
      return;
    }
    this.messages = [];
    await this.loadChannelMessages();
    await this.loadDmMessages();
  }

  /**
  * Loads recent messages from relevant channels.
  */
  private async loadChannelMessages() {
    for (const ch of this.relevantChannels) {
      try {
        const chats = await firstValueFrom(this.channelService.getChatsForChannel(ch.id));
        const mapped = chats.map(c => this.mapChannelMessage(c, ch));
        this.messages.push(...mapped);
      } catch (error) {
        console.error('Fehler beim Laden von Channel-Nachrichten:', error);
      }
    }
  }

  /**
  * Maps raw chat to channel message with sender/channel info.
  * @param chat Raw chat message.
  * @param channel Channel metadata.
  * @returns Mapped channel message object.
  */
  private mapChannelMessage(chat: any, channel: any) {
    const sender = this.users.find(u => u.uid === chat.user);
    return {
      type: 'channel-message',
      channelId: channel.id,
      channelName: channel.name,
      senderName: sender?.name || 'Unbekannt',
      participants: channel.participants,
      ...chat
    };
  }

  /**
  * Loads recent DM messages for current user.
  */
  private async loadDmMessages() {
    const dmIds = await this.dmService.getDmIdsForUser(this.currentUser!.uid);
    for (const dmId of dmIds) {
      const dmDoc = await firstValueFrom(this.dmService.getDmDoc(dmId));
      const dmMsgs = await firstValueFrom(this.dmService.getMessages(dmId));
      const mapped = dmMsgs.map(m => this.mapDmMessage(m, dmId, dmDoc));
      this.messages.push(...mapped);
    }
  }

  /**
  * Maps raw DM message with sender/DM info.
  * @param message Raw DM message.
  * @param dmId DM conversation ID.
  * @param dmDoc DM document metadata.
  * @returns Mapped DM message object.
  */
  private mapDmMessage(message: any, dmId: string, dmDoc: any) {
    const sender = this.users.find(u => u.uid === message.senderId);
    return {
      type: 'dm-message',
      dmId,
      participants: dmDoc.participants,
      senderName: sender?.name || 'Unbekannt',
      ...message
    };
  }

  /**
  * Returns channels user participates in.
  */
  get relevantChannels() {
    if (!this.currentUser) return [];
    return this.channels.filter(c => c.participants?.includes(this.currentUser?.uid));
  }

  /**
  * Sorts channels by creation date ascending.
  */
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

  /**
  * Converts Firestore timestamp to Date object.
  * @param value Timestamp value (seconds/nanoseconds or Date).
  * @returns Parsed Date.
  */
  private toDate(value: any): Date {
    if (value?.seconds) return new Date(value.seconds * 1000 + value.nanoseconds / 1e6);
    return new Date(value);
  }

  /**
  * Toggles channels expanded state.
  */
  toggleChannels() {
    this.channelsExpanded = !this.channelsExpanded;
  }

  /**
  * Emits new message event.
  */
  handleOpenNewMessage() {
    this.openNewMessage.emit()
  }

  /**
  * Emits add channel event, stops event propagation.
  */
  handleOpenAddChannel(event: Event) {
    event.stopPropagation();
    this.openAddChannel.emit();
  }

  /**
  * Activates channel and emits open event.
  * @param channel Channel to open.
  */
  handleOpenChannel(channel: Channel) {
    this.activeChannelId = channel.id;
    this.activeUserId = '';
    this.openChannel.emit(channel.id);
  }

  /**
  * Toggles users expanded state.
  */
  toggleUsers() {
    this.usersExpanded = !this.usersExpanded;
  }

  /**
  * Activates user chat and emits event.
  * @param user User to chat with.
  */
  handleOpenUserChat(user: User) {
    this.activeUserId = user.uid;
    this.activeChannelId = '';
    this.openUserChat.emit(user);
  }

  /**
  * Returns unique user ID for trackBy.
  * @param index Array index.
  * @param user User object.
  * @returns User UID.
  */
  trackByUserId(index: number, user: User): string {
    return user.uid;
  }

  /**
  * Updates caret position and search header state.
  */
  updateCaret(el: HTMLInputElement) {
    if (!el) return;
    this.caretIndex = el.selectionStart || 0;
    this.updateSearchHeaderState();
  }

  /**
  * Handles navigation to chat from search result.
  * @param item Selected search item.
  */
  onNavigateToChat(item: any) {
    this.clickFromOverlay = true;
    this.searchText = '';
    this.selectedItem.emit(item);
    this.inputFocused = false;
    this.showSearchHeader = false;
    this.cdr.markForCheck();
  }

  /**
  * Sets search input focused state.
  */
  onSearchFocus() {
    this.inputFocused = true;
    this.updateSearchHeaderState();
  }

  /**
  * Handles search input blur with click-from-overlay check.
  */
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

  /**
  * Clears search input and related states.
  */
  clearSearch() {
    this.searchText = '';
    this.inputFocused = false;
    this.showSearchHeader = false;
    this.cdr.markForCheck();
  }

  /**
  * Updates overlay state and search header.
  * @param active Overlay active state.
  */
  onOverlayStateChange(active: boolean) {
    this.overlayActive = active;
    if (!active) {
      this.showSearchHeader = false;
    } else {
      this.updateSearchHeaderState();
    }
  }

}

