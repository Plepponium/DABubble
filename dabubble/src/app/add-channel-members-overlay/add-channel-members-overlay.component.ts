import { Component, EventEmitter, HostListener, inject, Input, Output } from '@angular/core';
import { RoundBtnComponent } from '../round-btn/round-btn.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MentionsOverlayComponent } from '../shared/mentions-overlay/mentions-overlay.component';
import { User } from '../../models/user.class';
import { UserService } from '../../services/user.service';
import { ChannelService } from '../../services/channel.service';
import { takeUntil } from 'rxjs/internal/operators/takeUntil';
import { LogoutService } from '../../services/logout.service';

@Component({
  selector: 'app-add-channel-members-overlay',
  imports: [RoundBtnComponent, CommonModule, FormsModule, MentionsOverlayComponent],
  templateUrl: './add-channel-members-overlay.component.html',
  styleUrl: './add-channel-members-overlay.component.scss'
})
export class AddChannelMembersOverlayComponent {
  @Output() close = new EventEmitter<void>();
  @Output() channelCreated = new EventEmitter<any>();
  @Input() channel!: any;
  @Input() currentUser?: User;

  allUsers: Partial<User>[] = [];
  searchText = '';
  selectedMode: 'all' | 'custom' | null = null;
  selectedUser: Partial<User> | null = null;
  firstUserChannel: any = null;
  showOverlayResponsive = false;
  private isResponsive = false;

  userService = inject(UserService);
  channelService = inject(ChannelService);
  logoutService = inject(LogoutService);
  private destroy$ = this.logoutService.logout$;

  /** Initializes responsive state, loads users and first user channel. */
  ngOnInit(): void {
    this.isResponsive = window.innerWidth < 880;
    this.userService.getUsers().pipe(
      takeUntil(this.destroy$)
    ).subscribe(users => {
      this.allUsers = users;
    });
    this.channelService.getChannels().pipe(
      takeUntil(this.destroy$)
    ).subscribe(channels => {
      const userChannels = channels.filter(ch => ch.participants.includes(this.currentUser!.uid));
      if (userChannels.length > 0) {
        this.firstUserChannel = userChannels[0];
      }
    });
  }

  /** Starts overlay entry animation after view init on small screens. */
  ngAfterViewInit(): void {
    setTimeout(() => {
      if (this.isResponsive) {
        this.showOverlayResponsive = true;
      }
    }, 10);
  }

  /**
  * Handles window resize to update responsive state and overlay visibility.
  */
  @HostListener('window:resize', [])
  onResize(): void {
    this.isResponsive = window.innerWidth < 880;
    this.showOverlayResponsive = this.isResponsive;
  }

  /**
  * Closes overlay with animation on small screens, immediately on desktop.
  */
  handleClose(): void {
    if (this.isResponsive) {
      this.showOverlayResponsive = false;
      setTimeout(() => this.close.emit(), 350);
    } else {
      this.close.emit();
    }
  }

  /**
  * Returns whether the create button should be disabled.
  * - Disabled if no mode selected.
  * - Enabled for 'all'.
  * - For 'custom', requires a selected user.
  */
  isCreateDisabled(): boolean {
    if (!this.selectedMode) return true;
    if (this.selectedMode === 'all') return false;
    if (this.selectedMode === 'custom' && !this.selectedUser) return true;
    return false;
  }

  /**
  * Selects a user by name from mention overlay.
  * @param event Event containing selected user name
  */
  selectUser(event: { name: string }): void {
    this.selectedUser = this.allUsers.find(u => u.name === event.name) || null;
    this.searchText = '';
  }

  /** Clears selected user and resets search text. */
  removeUser(): void {
    this.selectedUser = null;
    this.searchText = '';
  }

  /**
  * Handles channel creation based on selected mode.
  * - Validates input.
  * - Builds participant list.
  * - Creates channel and emits result.
  */
  async handleCreate(): Promise<void> {
    if (!this.channel || !this.currentUser) return;
    if (this.isCreateDisabled()) return;
    const extraParticipants = this.getExtraParticipants();
    const newChannelData = this.buildNewChannelData(extraParticipants);
    const channelRef = await this.channelService.addChannel(newChannelData);
    this.channelCreated.emit({ id: channelRef.id, ...newChannelData });
    this.handleClose();
  }

  /**
  * Computes additional participants based on selected mode.
  * @returns Array of user IDs to be added as extra participants
  */
  private getExtraParticipants(): string[] {
    if (this.selectedMode === 'all' && this.firstUserChannel) {
      return this.firstUserChannel.participants;
    }
    if (this.selectedMode === 'custom' && this.selectedUser?.uid) {
      return [this.selectedUser.uid];
    }
    return [];
  }

  /**
  * Builds a new channel payload including merged participant list.
  * Ensures currentUser is included at least once.
  * @param extraParticipants Extra participant user IDs
  * @returns New channel data object
  */
  private buildNewChannelData(extraParticipants: string[]): any {
    const baseParticipants = this.channel.participants || [this.currentUser!.uid];
    const allParticipants = Array.from(new Set([...baseParticipants, ...extraParticipants]));
    return {
      ...this.channel,
      participants: allParticipants
    };
  }
}
