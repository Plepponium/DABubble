import { Component, HostListener, inject, ViewChild } from '@angular/core';
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
import { AddChannelMembersOverlayComponent } from '../add-channel-members-overlay/add-channel-members-overlay.component';
import { InputMissingOverlayComponent } from "../input-missing-overlay/input-missing-overlay.component";
import { ChannelService } from '../../services/channel.service';

@Component({
  selector: 'app-main-page',
  imports: [CommonModule, HeaderComponent, MenuComponent, ChatsComponent, ThreadComponent, DirectMessageChatsComponent, NewMessageComponent, MatIconModule, MatSidenavModule, MatButtonModule, MatToolbarModule, AddChannelOverlayComponent, AddChannelMembersOverlayComponent, UserProfileComponent, EditUserComponent, ProfileOverlayComponent, LogoutOverlayComponent, InputMissingOverlayComponent],
  templateUrl: './main-page.component.html',
  styleUrl: './main-page.component.scss',
})
export class MainPageComponent {
  @ViewChild('chats') chatsComponent!: ChatsComponent;

  menuOpen = true;
  menuBtnClose = true;
  threadOpen = false;
  channelOpen = false;
  userChatOpen = false;
  newMessageOpen = true;

  showLogoutOverlay = false;
  showUserProfile = false;
  showEditUser = false;
  showProfileOverlay = false;
  showAddChannelDialogue = false;
  showMemberOverlay = false;
  inputMissing = false;
  missingInfo: { recipientMissing: boolean; textMissing: boolean; } | null = null;
  isSmallScreen = false;

  allUsers: any[] = [];
  allChannels: any[] = [];

  currentUser?: User;
  currentChannelId?: string;
  activeUserId?: string;
  threadChatId?: string;

  selectedProfile: any = null;
  createdChannel: any = null;

  private userService = inject(UserService);
  private channelService = inject(ChannelService);
  private router = inject(Router);
  private authSub?: Subscription;

  @HostListener('window:resize', [])
  onResize() {
    this.isSmallScreen = window.innerWidth < 1512;
  }

  ngOnInit() {
    this.onResize();
    this.authSub = this.userService.getCurrentUser().subscribe(user => {
      if (!user) {
        this.router.navigate(['/']);
        return;
      }
      this.currentUser = user;
      this.userService.getUsers().subscribe(u => this.allUsers = u);
      this.channelService.getChannels().subscribe(c => this.allChannels = c);
    });
  }

  ngOnDestroy() {
    this.authSub?.unsubscribe();
  }

  get isNmOpen(): boolean {
    return this.newMessageOpen;
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

  openChannelMemberOverlay(channelData: any) {
    this.createdChannel = channelData;
    this.closeAllOverlays();
    this.showMemberOverlay = true;
  }

  closeMemberOverlay() {
    this.showMemberOverlay = false;
    this.createdChannel = null;
  }

  openChannel(channelId: string) {
    this.currentChannelId = channelId;
    this.userChatOpen = false;
    this.activeUserId = undefined;
    this.threadOpen = false;
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

  openChatFromHeader(item: any) {
    if (!item) return;
    if (item.type === 'channel-message') return this.handleChannelMessage(item);
    if (item.type === 'dm-message') return this.handleDmMessage(item);
    if (this.isUserMention(item)) return this.handleUserMention(item);
    if (this.isChannelMention(item)) return this.handleChannelMention(item);
    console.warn('Unknown item type, cannot open:', item);
  }

  private handleChannelMessage(item: any) {
    const id = item.channelId;
    if (!id) {
      console.warn('ChannelId not found in message:', item);
      return;
    }
    this.openChannel(id);
  }

  private handleDmMessage(item: any) {
    const otherUid =
      item.participants.find((p: string) => p !== this.currentUser?.uid)
      || item.participants[0];
    const user = this.allUsers.find(u => u.uid === otherUid);
    if (user) this.openUserChat(user);
    else console.warn('DM participant not found:', otherUid);
  }

  private handleUserMention(item: any) {
    this.openUserChat(item);
  }

  private handleChannelMention(item: any) {
    this.openChannel(item.id);
  }

  private isUserMention(item: any): boolean {
    return !!item.uid;
  }

  private isChannelMention(item: any): boolean {
    return !!(item.id && item.participants && item.name);
  }




  openThread(event: { channelId: string; chatId: string }) {
    this.threadOpen = true;
    this.threadChatId = event.chatId;
    this.currentChannelId = event.channelId;

    if (this.isSmallScreen) {
      this.channelOpen = false;
    }
  }

  onThreadClosed() {
    this.threadOpen = false;

    // Auf kleinen Screens Chats wieder anzeigen
    if (this.isSmallScreen) {
      this.channelOpen = true;
    }
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

  openProfileOverlay(user: User) {
    this.closeAllOverlays();
    if (this.currentUser?.uid === user.uid) {
      this.showUserProfile = true;
      return;
    }
    this.selectedProfile = user;
    this.showProfileOverlay = true;
  }

  openEditUser() {
    this.closeAllOverlays();
    this.showEditUser = true;
  }

  openInputMissingOverlay(info: { recipientMissing: boolean; textMissing: boolean }) {
    this.missingInfo = info;
    this.inputMissing = true;
  }

  closeInputMissingOverlay() {
    this.inputMissing = false;
    this.missingInfo = null;
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
    return this.showUserProfile || this.showEditUser || this.showProfileOverlay || this.showLogoutOverlay || this.showAddChannelDialogue || this.showMemberOverlay;
  }

  onChannelDeleted() {
    this.channelOpen = false;
    this.newMessageOpen = true;
    this.currentChannelId = undefined;
  }

  onAnswerAdded(event: { chatId: string; answerTime: number }) {
    this.chatsComponent.handleAnswerAdded(event);
  }

  logout() {
    this.authSub?.unsubscribe();
    this.userService.logout().then(() => {
      this.router.navigate(['/']);
    });
  }
}