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
import { combineLatest, firstValueFrom, of, Subscription, switchMap, takeUntil } from 'rxjs';
import { NewMessageComponent } from '../new-message/new-message.component';
import { AddChannelMembersOverlayComponent } from '../add-channel-members-overlay/add-channel-members-overlay.component';
import { InputMissingOverlayComponent } from "../input-missing-overlay/input-missing-overlay.component";
import { ChannelService } from '../../services/channel.service';
import { LogoutService } from '../../services/logout.service';

@Component({
  selector: 'app-main-page',
  imports: [CommonModule, HeaderComponent, MenuComponent, ChatsComponent, ThreadComponent, DirectMessageChatsComponent, NewMessageComponent, MatIconModule, MatSidenavModule, MatButtonModule, MatToolbarModule, AddChannelOverlayComponent, AddChannelMembersOverlayComponent, UserProfileComponent, EditUserComponent, ProfileOverlayComponent, LogoutOverlayComponent, InputMissingOverlayComponent],
  templateUrl: './main-page.component.html',
  styleUrl: './main-page.component.scss',
})
export class MainPageComponent {
  @ViewChild('chats') chatsComponent!: ChatsComponent;
  @ViewChild('dmChats') dmChatsComponent!: DirectMessageChatsComponent;

  // State flags
  menuOpen = true;
  threadOpen = false;
  channelOpen = false;
  userChatOpen = false;
  newMessageOpen = true;
  contentOpen = false;
  dataReady = false;
  menuBtnClose = true;

  // Overlay states
  showLogoutOverlay = false;
  isClosingLogoutOverlay = false;
  showUserProfile = false;
  showEditUser = false;
  showProfileOverlay = false;
  showAddChannelDialogue = false;
  showMemberOverlay = false;
  inputMissing = false;

  // Data
  allUsers: any[] = [];
  allChannels: any[] = [];
  createdChannel: any = null;
  missingInfo: { recipientMissing: boolean; textMissing: boolean; } | null = null;
  selectedProfile: any = null;

  // IDs
  currentUser?: User;
  currentChannelId?: string;
  activeUserId?: string;
  threadChatId?: string;

  // Screen sizes
  isSmallScreen = false;
  isResponsiveScreen = false;

  // Services
  private userService = inject(UserService);
  private channelService = inject(ChannelService);
  private router = inject(Router);
  private logoutService = inject(LogoutService);
  private destroy$ = this.logoutService.logout$;

  /** Checks if profile backdrop should show. */
  get showProfileBackdrop(): boolean {
    return this.showUserProfile || this.showProfileOverlay;
  }

  /** Checks if new message overlay is open. */
  get isNmOpen(): boolean {
    return this.newMessageOpen;
  }

  /** Checks if DM chat is open. */
  get isDmOpen(): boolean {
    return this.userChatOpen && !!this.activeUserId;
  }

  /** Handles window resize events. */
  @HostListener('window:resize', [])
  onResize() {
    this.isSmallScreen = window.innerWidth < 1512;
    this.isResponsiveScreen = window.innerWidth <= 880;
  }

  /** Initializes component on init. */
  ngOnInit() {
    this.onResize();
    this.initUserData();
  }

  /** Initializes user data subscriptions. */
  private initUserData(): void {
    this.userService.getCurrentUser().pipe(takeUntil(this.destroy$)).subscribe(user => {
      if (!user) {
        this.router.navigate(['/']);
        return;
      }
      this.currentUser = user;
      this.subscribeToUsers();
      this.subscribeToChannels();
      this.dataReady = true;
    });
  }

  /** Subscribes to users list. */
  private subscribeToUsers(): void {
    this.userService.getUsers().pipe(takeUntil(this.destroy$)).subscribe(u => {
      this.allUsers = u;
    });
  }

  /** Subscribes to channels list. */
  private subscribeToChannels(): void {
    this.channelService.getChannels().pipe(takeUntil(this.destroy$)).subscribe(c => {
      this.allChannels = c;
    });
  }

  /** Triggers logout on destroy. */
  ngOnDestroy(): void {
    this.logoutService.triggerLogout();
  }


  /** Toggles menu open state. */
  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  /** Opens menu. */
  openMenu() {
    this.menuOpen = true;
  }

  /** Opens new message overlay. */
  openNewMessage() {
    this.resetChatStates();
    this.newMessageOpen = true;
    this.contentOpen = true;
    this.closeMenuIfResponsive();
  }

  /** Resets all chat states. */
  private resetChatStates(): void {
    this.channelOpen = false;
    this.userChatOpen = false;
    this.threadOpen = false;
    this.newMessageOpen = false;
    this.currentChannelId = undefined;
    this.activeUserId = undefined;
  }

  /** Closes menu on responsive screens. */
  private closeMenuIfResponsive(): void {
    if (this.isResponsiveScreen) {
      this.menuOpen = false;
    }
  }

  /** Opens add channel dialogue. */
  openAddChannel() { this.showAddChannelDialogue = true; }

  /** Decides whether to close add channel based on screen size. */
  chooseToCloseAddChannel(): void {
    if (window.innerWidth > 880) {
      this.closeAddChannel();
    }
  }

  /** Closes add channel dialogue. */
  closeAddChannel() { this.showAddChannelDialogue = false; }

  /** Opens member overlay for channel draft. */
  openChannelMemberOverlay(draft: any) {
    this.createdChannel = draft;
    this.showMemberOverlay = true;
  }

  /** Closes member overlay. */
  closeMemberOverlay() {
    this.showMemberOverlay = false;
    this.createdChannel = null;
    this.closeAllOverlays();
  }

  /** Opens specific channel. */
  openChannel(channelId: string) {
    this.resetChatStates();
    this.currentChannelId = channelId;
    this.channelOpen = true;
    this.closeMenuIfResponsive();
  }

  /** Opens created channel and closes overlay. */
  openCreatedChannel(channel: any) {
    this.openChannel(channel.id);
    this.closeMemberOverlay();
  }

  /** Opens user chat. */
  openUserChat(user: User) {
    this.resetChatStates();
    this.activeUserId = user.uid;
    this.userChatOpen = true;
    this.closeMenuIfResponsive();
  }

  /** Opens chat from searchbar item. */
  openChatFromSearchbar(item: any) {
    if (!item) return;
    if (item.type === 'channel-message') return this.handleChannelMessage(item);
    if (item.type === 'dm-message') return this.handleDmMessage(item);
    if (this.isUserMention(item)) return this.handleUserMention(item);
    if (this.isChannelMention(item)) return this.handleChannelMention(item);
    console.warn('Unknown item type, cannot open:', item);
  }

  /** Handles channel message navigation. */
  private handleChannelMessage(item: any) {
    this.openChannel(item.channelId);
    setTimeout(() => this.chatsComponent?.scrollToMessage(item.id), 200);
  }

  /** Handles DM message navigation. */
  private handleDmMessage(item: any) {
    const otherUid = item.participants.find((p: string) => p !== this.currentUser?.uid) || item.participants[0];
    const user = this.allUsers.find(u => u.uid === otherUid);
    if (user) {
      this.openUserChat(user);
      setTimeout(() => this.dmChatsComponent?.scrollToMessage(item.id), 200);
    }
  }

  /** Handles user mention navigation. */
  private handleUserMention(item: any) {
    this.openUserChat(item);
  }

  /** Handles channel mention navigation. */
  private handleChannelMention(item: any) {
    this.openChannel(item.id);
  }

  /** Checks if item is user mention. */
  private isUserMention(item: any): boolean {
    return !!item.uid;
  }

  /** Checks if item is channel mention. */
  private isChannelMention(item: any): boolean {
    return !!(item.id && item.participants && item.name);
  }

  /** Opens thread chat. */
  openThread(event: { channelId: string; chatId: string }) {
    this.threadOpen = true;
    this.threadChatId = event.chatId;
    this.currentChannelId = event.channelId;
    if (this.isSmallScreen) {
      this.channelOpen = false;
    }
  }

  /** Handles thread close event. */
  onThreadClosed() {
    this.threadOpen = false;

    if (this.isSmallScreen) {
      this.channelOpen = true;
    }
  }

  /** Opens logout overlay. */
  openLogoutOverlay() {
    this.showLogoutOverlay = true;
  }

  /** Opens user profile. */
  openUserProfile() {
    this.showUserProfile = true;
  }

  /** Opens DM chat from overlay. */
  openDmChatFromOverlay(user: User) {
    this.closeAllOverlays();
    this.openUserChat(user);
  }

  /** Opens profile overlay for user. */
  openProfileOverlay(user: User) {
    if (this.currentUser?.uid === user.uid) {
      this.showUserProfile = true;
      return;
    }
    this.selectedProfile = user;
    this.showProfileOverlay = true;
  }

  /** Opens edit user overlay. */
  openEditUser() {
    this.closeAllOverlays();
    this.showEditUser = true;
  }

  /** Opens input missing overlay. */
  openInputMissingOverlay(info: { recipientMissing: boolean; textMissing: boolean }) {
    this.missingInfo = info;
    this.inputMissing = true;
  }

  /** Closes input missing overlay. */
  closeInputMissingOverlay() {
    this.inputMissing = false;
    this.missingInfo = null;
  }

  /** Closes user profile overlay. */
  closeUserOverlay() {
    this.showUserProfile = false;
  }

  /** Closes profile overlay. */
  closeProfileOverlay() {
    this.showProfileOverlay = false;
  }

  /** Closes all overlays. */
  closeAllOverlays() {
    this.isClosingLogoutOverlay = true;
    this.showUserProfile = false;
    this.showEditUser = false;
    this.showProfileOverlay = false;
    this.showAddChannelDialogue = false;
    this.selectedProfile = null;
    this.logoutOverlayAnimationPlayed();
  }

  /** Handles logout overlay animation end. */
  logoutOverlayAnimationPlayed() {
    if (this.isResponsiveScreen) {
      setTimeout(() => {
        this.showLogoutOverlay = false;
        this.isClosingLogoutOverlay = false;
      }, 350);
    } else {
      this.showLogoutOverlay = false;
    }
  }

  /** Checks if any overlay is open. */
  anyOverlayOpen() {
    return this.showUserProfile || this.showEditUser || this.showProfileOverlay || this.showLogoutOverlay || this.showAddChannelDialogue || this.showMemberOverlay;
  }

  /** Handles channel deletion. */
  onChannelDeleted() {
    this.channelOpen = false;
    this.newMessageOpen = true;
    this.currentChannelId = undefined;
  }

  /** Handles answer added event. */
  onAnswerAdded(event: { chatId: string; answerTime: number }) {
    this.chatsComponent.handleAnswerAdded(event);
  }

  /** Calls logout on user service and navigates to login page on success. */
  logout() {
    this.userService.logout().then(() => {
      this.router.navigate(['/']);
    });
  }
}