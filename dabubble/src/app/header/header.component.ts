import { Component, ElementRef, EventEmitter, inject, Input, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { User } from '../../models/user.class';
import { UserService } from '../../services/user.service';
import { firstValueFrom, Observable } from 'rxjs';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MentionsOverlayComponent } from '../shared/mentions-overlay/mentions-overlay.component';
import { ChannelService } from '../../services/channel.service';
import { DirectMessageService } from '../../services/direct-messages.service';

@Component({
  selector: 'app-header',
  imports: [MatIconModule, MatButtonModule, CommonModule, FormsModule, MentionsOverlayComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  @Output() openLogoutOverlay = new EventEmitter<void>();
  @Output() openUserProfile = new EventEmitter<void>();
  @Output() selectedItem = new EventEmitter<any>();
  @Output() openMenu = new EventEmitter<string>();
  @Input() users: any[] = [];
  @Input() channels: any[] = [];
  @Input() currentUser: User | undefined;
  @Input() menuOpen: boolean = true;

  searchText = '';
  caretIndex: number | null = null;
  overlayActive = false;
  inputFocused = false;
  private clickFromOverlay = false;
  messages: any[] = [];

  userService = inject(UserService)
  channelService = inject(ChannelService)
  dmService = inject(DirectMessageService)
  router = inject(Router);

  /**
  * Lifecycle hook: reloads message data when user, channels, or user list change.
  * @param changes - Object containing the changed input properties.
  */
  ngOnChanges(changes: SimpleChanges) {
    if (!this.currentUser || !this.channels?.length || !this.users?.length) return;
    if (changes['currentUser'] || changes['channels'] || changes['users']) {
      this.loadMessages();
    }
  }

  /**
  * Emits event to toggle the sidebar menu.
  */
  handleOpenMenu() {
    this.openMenu.emit()
  }

  /**
  * Loads recent messages from both channels and direct messages.
  * @async
  */
  private async loadMessages() {
    this.messages = [];
    await this.loadChannelMessages();
    await this.loadDmMessages();
  }


  /**
  * Loads messages from all channels the user participates in.
  * Refactored for clarity and brevity.
  * @async
  */
  private async loadChannelMessages() {
    for (const ch of this.relevantChannels) {
      const chats = await firstValueFrom(this.channelService.getChatsForChannel(ch.id));
      this.messages.push(...this.mapChannelMessages(ch, chats));
    }
  }

  /**
  * Maps chat data into a unified structure for channel messages.
  * @param ch - Channel object with ID, name, and participants.
  * @param chats - Array of chat message objects.
  * @returns An array of mapped message objects.
  */
  private mapChannelMessages(ch: any, chats: any[]): any[] {
    return chats.map(c => {
      const sender = this.users.find(u => u.uid === c.user);
      return {
        type: 'channel-message',
        channelId: ch.id,
        channelName: ch.name,
        participants: ch.participants,
        senderName: sender?.name || 'Unbekannt',
        ...c
      };
    });
  }

  /**
  * Loads messages from all direct message threads of the current user.
  * Refactored for conciseness.
  * @async
  */
  private async loadDmMessages() {
    const dmIds = await this.dmService.getDmIdsForUser(this.currentUser!.uid);
    for (const dmId of dmIds) {
      const dmDoc = await firstValueFrom(this.dmService.getDmDoc(dmId));
      const dmMsgs = await firstValueFrom(this.dmService.getMessages(dmId));
      this.messages.push(...this.mapDmMessages(dmId, dmDoc, dmMsgs));
    }
  }

  /**
  * Maps direct message data into a consistent message object structure.
  * @param dmId - Direct message thread ID.
  * @param dmDoc - The DM document containing participants.
  * @param dmMsgs - Array of message objects.
  * @returns An array of mapped direct message objects.
  */
  private mapDmMessages(dmId: string, dmDoc: any, dmMsgs: any[]): any[] {
    return dmMsgs.map(m => {
      const sender = this.users.find(u => u.uid === m.senderId);
      return {
        type: 'dm-message',
        dmId,
        participants: dmDoc.participants,
        senderName: sender?.name || 'Unbekannt',
        ...m
      };
    });
  }

  /**
  * Filters channels to only include those the current user participates in.
  */
  get relevantChannels() {
    if (!this.currentUser) return [];
    return this.channels.filter(c => c.participants?.includes(this.currentUser?.uid));
  }

  /**
  * Updates caret position for the search input.
  * @param el - The HTML input element.
  */
  updateCaret(el: HTMLInputElement) {
    if (!el) return;
    this.caretIndex = el.selectionStart || 0;
  }

  /**
  * Handles navigation to a selected chat item.
  * @param item - The selected chat or user item.
  */
  onNavigateToChat(item: any) {
    this.clickFromOverlay = true;
    this.searchText = '';
    this.selectedItem.emit(item);
    this.inputFocused = false;
  }

  /** Marks the search bar as focused. */
  onSearchFocus() {
    this.inputFocused = true;
  }

  /** Handles loss of focus, considering overlay interaction. */
  onSearchBlur() {
    setTimeout(() => {
      if (!this.clickFromOverlay) {
        this.inputFocused = false;
      }
      this.clickFromOverlay = false;
    }, 100);
  }

  /**
  * Returns the user’s avatar image name or a default.
  * @param user - Optional user object.
  * @returns Path/name of the avatar image.
  */
  getAvatarImg(user?: User): string {
    return user?.img || 'default-user';
  }

  /** Opens the logout confirmation dialog. */
  openDialogueLogout() {
    this.openLogoutOverlay.emit();
  }

  /** Opens the user profile dialog from header. */
  openProfileFromHeader() {
    this.openUserProfile.emit();
  }

  /**
  * Logs the user out and navigates back to the root route.
  * @async
  */
  logout() {
    this.userService.logout().then(() => {
      this.router.navigate(['/']);
    });
  }
}