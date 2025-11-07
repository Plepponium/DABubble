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
import { DirectMessageChatsComponent } from '../direct-message-chats/direct-message-chats.component';
import { User } from '../../models/user.class';
import { UserProfileComponent } from '../user-profile/user-profile.component';
import { EditUserComponent } from '../edit-user/edit-user.component';
import { ProfileOverlayComponent } from '../profile-overlay/profile-overlay.component';
import { LogoutOverlayComponent } from '../logout-overlay/logout-overlay.component';
import { UserService } from '../../services/user.service';
import { Router } from '@angular/router';
import { firstValueFrom, Subscription } from 'rxjs';
import { NewMessageComponent } from '../new-message/new-message.component';

@Component({
  selector: 'app-main-page',
  imports: [CommonModule, HeaderComponent, MenuComponent, ChatsComponent, ThreadComponent, DirectMessageChatsComponent, NewMessageComponent, MatIconModule, MatSidenavModule, MatButtonModule, MatToolbarModule, AddChannelOverlayComponent, UserProfileComponent, EditUserComponent, ProfileOverlayComponent, LogoutOverlayComponent],
  templateUrl: './main-page.component.html',
  styleUrl: './main-page.component.scss',
})
export class MainPageComponent {
  menuOpen = true;
  menuBtnClose = true;
  showAddChannelDialogue = false;
  threadOpen = false;
  channelOpen = true;
  userChatOpen = false;
  newMessageOpen = false;
  currentChannelId?: string;
  activeUserId?: string;
  threadChatId?: string;

  showLogoutOverlay = false;
  showUserProfile = false;
  showEditUser = false;
  showProfileOverlay = false;

  selectedProfile: any = null;

  private userService = inject(UserService);
  private router = inject(Router);
  private authSub?: Subscription;

  ngOnInit() {
    this.authSub = this.userService.getCurrentUser().subscribe(user => {
      if (!user) {
        this.router.navigate(['/']);
      }
    });
  }

  ngOnDestroy() {
    this.authSub?.unsubscribe();
  }

  get isDmOpen(): boolean {
    return this.userChatOpen && !!this.activeUserId;
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  openNewMessage() {
    this.newMessageOpen = true;
    this.channelOpen = false;
    this.threadOpen = false;
    this.currentChannelId = undefined;
    this.userChatOpen = false;
    this.activeUserId = undefined;
  }

  openAddChannel() {
    this.showAddChannelDialogue = true;
  }

  closeAddChannel() {
    this.showAddChannelDialogue = false;
  }

  openChannel(channelId: string) {
    this.currentChannelId = channelId;
    this.userChatOpen = false;
    this.activeUserId = undefined;
    this.threadOpen = true;
    this.channelOpen = true;
    this.newMessageOpen = false;
  }

  openUserChat(user: User) {
    this.activeUserId = user.uid;
    this.userChatOpen = true;
    this.currentChannelId = undefined;
    this.channelOpen = false;
    this.threadOpen = false;
    this.newMessageOpen = false;
  }

  openThread(event: { channelId: string; chatId: string }) {
    this.threadChatId = event.chatId;
    this.currentChannelId = event.channelId;
    this.threadOpen = true;
  }

  openLogoutOverlay() {
    this.closeAllOverlays();
    this.showLogoutOverlay = true;
  }

  openUserProfile() {
    this.closeAllOverlays();
    this.showUserProfile = true;
  }

  openDmChatFromOverlay(user: User) {
    this.closeAllOverlays();
    this.openUserChat(user);
  }

  async openProfileOverlay(user: User) {
    this.closeAllOverlays();

    const currentUser = await firstValueFrom(this.userService.getCurrentUser());
    if (currentUser?.uid === user.uid) {
      this.openUserProfile();
      return;
    }
    if (user) {
      this.selectedProfile = user;
      this.showProfileOverlay = true;
    }
  }


  openEditUser() {
    this.closeAllOverlays();
    this.showEditUser = true;
  }

  closeAllOverlays() {
    this.showUserProfile = false;
    this.showEditUser = false;
    this.showProfileOverlay = false;
    this.showLogoutOverlay = false;
    this.showAddChannelDialogue = false;
    this.selectedProfile = null;
  }

  anyOverlayOpen() {
    return this.showUserProfile || this.showEditUser || this.showProfileOverlay || this.showLogoutOverlay || this.showAddChannelDialogue;
  }

  logout() {
    this.authSub?.unsubscribe();
    this.userService.logout().then(() => {
      this.router.navigate(['/']);
    });
  }


}
