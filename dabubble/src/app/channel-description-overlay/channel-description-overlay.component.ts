import { Component, EventEmitter, HostListener, inject, Input, Output } from '@angular/core';
import { RoundBtnComponent } from '../round-btn/round-btn.component';
import { Channel } from '../../models/channel.class';
import { ChannelService } from '../../services/channel.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { User } from '../../models/user.class';
import { LogoutService } from '../../services/logout.service';
import { takeUntil } from 'rxjs/internal/operators/takeUntil';

@Component({
  selector: 'app-channel-description-overlay',
  imports: [RoundBtnComponent, CommonModule, FormsModule],
  templateUrl: './channel-description-overlay.component.html',
  styleUrl: './channel-description-overlay.component.scss'
})
export class ChannelDescriptionOverlayComponent {
  @Input() channelId?: string;
  @Input() currentUserId?: string;
  @Input() participants: User[] = [];
  @Output() close = new EventEmitter<void>();
  @Output() channelDeleted = new EventEmitter<void>();
  @Output() openProfile = new EventEmitter<User>();
  @Output() openAddUserResponsive = new EventEmitter<void>();

  channel?: Channel;
  isEditingName = false;
  isEditingDescription = false;
  isScreenUnder1010 = false;
  editedName = '';
  editedDescription = '';
  private initialChannelNames: string[] = [];

  channelService = inject(ChannelService);
  private logoutService = inject(LogoutService);
  private destroy$ = this.logoutService.logout$;


  /**
  * Updates the screen size flag when window is resized.
  * Triggers on window resize events for responsive layout handling.
  */
  @HostListener('window:resize', [])
  onResize() {
    this.isScreenUnder1010 = window.innerWidth < 1010;
  }

  /** Initializes the component by loading channel data and initial channel names. */
  ngOnInit() {
    this.loadInitialChannelNames();
    this.loadChannelWithId();
  }

  /** Loads the initial channel names for validation purposes. */
  private loadInitialChannelNames(): void {
    this.channelService.getChannels().pipe(
      takeUntil(this.destroy$)
    ).subscribe(channels => {
      this.initialChannelNames = channels.map(channel =>
        channel.name.trim().toLowerCase()
      );
    });
  }

  /** Loads the channel with the specified ID. */
  private loadChannelWithId(): void {
    if (this.channelId) {
      this.channelService.getChannelById(this.channelId).pipe(
        takeUntil(this.destroy$)
      ).subscribe(channel => {
        this.channel = channel;
        this.editedName = channel?.name ?? '';
        this.editedDescription = channel?.description ?? '';
      });
    }
  }

  /** Checks if a channel name already exists. */
  get nameExistsError(): boolean {
    const normalizedName = this.editedName.trim().toLowerCase();
    const currentName = this.channel?.name?.trim().toLowerCase() || '';
    return this.initialChannelNames.includes(normalizedName) && normalizedName !== currentName;
  }

  /** Checks if the channel is a "Willkommen" channel based on its name. */
  get isWillkommenChannel(): boolean {
    return this.channel?.name?.trim().toLowerCase() === 'willkommen';
  }

  /** Determines if the channel name edit should be disabled based on the channel type. */
  get isNameEditDisabled(): boolean {
    return this.isWillkommenChannel;
  }

  /**
  * Toggles the channel name edit mode.
  * Saves changes if exiting edit mode with a new valid name.
  */
  toggleEditName() {
    if (this.isNameEditDisabled) return;
    if (this.isEditingName && this.channel) {
      if (this.nameExistsError) return;
      if (this.editedName && this.editedName !== this.channel.name) {
        this.channelService.updateChannel(this.channel.id, { name: this.editedName })
          .then(() => {
            this.channel!.name = this.editedName;
            this.loadInitialChannelNames();
          });
      }
    }
    this.isEditingName = !this.isEditingName;
  }

  /**
  * Toggles the channel description edit mode.
  * Saves changes if exiting edit mode with a new description.
  */
  toggleEditDescription() {
    if (this.isEditingDescription && this.channel) {
      if (this.editedDescription !== this.channel.description) {
        this.channelService.updateChannel(this.channel.id, { description: this.editedDescription })
          .then(() => {
            this.channel!.description = this.editedDescription;
          });
      }
    }
    this.isEditingDescription = !this.isEditingDescription;
  }

  /**
  * Removes the current user from the channel or deletes it if empty.
  * If no participants remain, the channel is deleted.
  */
  async leaveChannel() {
    if (!this.channel || !this.currentUserId) return;
    const updatedParticipants = this.getUpdatedParticipants();
    try {
      if (updatedParticipants.length === 0) {
        await this.deleteChannelAndClose();
        return;
      }
      await this.channelService.updateChannel(this.channel.id, { participants: updatedParticipants });
      this.handleClose();
    } catch (error) {
      console.error('Fehler beim Verlassen des Channels:', error);
    }
  }

  /**
  * Returns the updated participants list without the current user.
  * @returns {string[]} List of remaining participant IDs.
  */
  private getUpdatedParticipants(): string[] {
    return this.channel?.participants?.filter(id => id !== this.currentUserId) || [];
  }

  /**
  * Deletes the channel and emits necessary events.
  */
  private async deleteChannelAndClose(): Promise<void> {
    if (!this.channel) return;
    await this.channelService.deleteChannel(this.channel.id);
    this.channelDeleted.emit();
    this.handleClose();
  }

  /** Closes the overlay by emitting the close event. */
  handleClose() {
    this.close.emit();
  }

  /**
  * Emits the openProfile event with the selected user.
  * @param {User} user - The user whose profile should be opened.
  */
  handleOpenProfile(user: User) {
    this.openProfile.emit(user);
  }

  /**
  * Emits the openAddUserResponsive event for responsive view.
  */
  handleOpenAddUser() {
    this.openAddUserResponsive.emit();
  }
}
