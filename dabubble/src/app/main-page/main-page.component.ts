import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../header/header.component';
import { MenuComponent } from '../menu/menu.component';
import { ChatsComponent } from '../chats/chats.component';
import { ThreadComponent } from '../thread/thread.component';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { AddChannelOverlayComponent } from '../add-channel-overlay/add-channel-overlay.component';
import { ChannelService } from '../../services/channel.service';
import { DirectMessageChatsComponent } from '../direct-message-chats/direct-message-chats.component';
import { User } from '../../models/user.class';

@Component({
  selector: 'app-main-page',
  imports: [CommonModule, HeaderComponent, MenuComponent, ChatsComponent, ThreadComponent, DirectMessageChatsComponent, MatIconModule, MatSidenavModule, MatButtonModule, MatToolbarModule, AddChannelOverlayComponent],
  templateUrl: './main-page.component.html',
  styleUrl: './main-page.component.scss',
  providers: [ChannelService],
})
export class MainPageComponent {
  menuOpen = true;
  menuBtnClose = true;
  showAddChannelDialogue = false;
  threadOpen = true;
  channelOpen = true;
  userChatOpen = false;
  currentChannelId?: string;
  activeUserId?: string;

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  openAddChannel() {
    // event.stopPropagation(); // Verhindert, dass das click-Event der list-header-container ausgelöst wird
    this.showAddChannelDialogue = true;
    // this.openAddChannel.emit();
  }

  closeAddChannel() {
    this.showAddChannelDialogue = false;
  }

  openChannel(channelId: string) {
    this.currentChannelId = channelId;
  }

  openUserChat(user: User) {
    this.activeUserId = user.uid;
    this.userChatOpen = true;
    this.channelOpen = false;
    this.threadOpen = false;
  }

}
