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

  @Input() users: any[] = [];
  @Input() channels: any[] = [];
  @Input() currentUser: User | undefined;

  searchText = '';
  caretIndex: number | null = null;
  overlayActive = false;
  inputFocused = false;


  messages: any[] = [];

  userService = inject(UserService)
  channelService = inject(ChannelService)
  dmService = inject(DirectMessageService)
  router = inject(Router);

  ngOnChanges(changes: SimpleChanges) {
    if (!this.currentUser || !this.channels?.length || !this.users?.length) return;
    if (changes['currentUser'] || changes['channels'] || changes['users']) {
      this.loadMessages();
    }
  }

  private async loadMessages() {
    this.messages = [];
    await this.loadChannelMessages();
    await this.loadDmMessages();
  }

  private async loadChannelMessages() {
    for (const ch of this.relevantChannels) {
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

  updateCaret(el: HTMLInputElement) {
    if (!el) return;
    this.caretIndex = el.selectionStart || 0;
  }

  onNavigateToChat(item: any) {
    this.searchText = '';
    this.selectedItem.emit(item);
  }

  onSearchFocus() {
    this.inputFocused = true;
  }

  onSearchBlur() {
    this.inputFocused = false;
  }



  getAvatarImg(user?: User): string {
    return user?.img || 'default-user';
  }

  openDialogueLogout() {
    this.openLogoutOverlay.emit();
  }

  openProfileFromHeader() {
    this.openUserProfile.emit();
  }

  logout() {
    this.userService.logout().then(() => {
      this.router.navigate(['/']);
    });
  }
}
