import { Component, EventEmitter, HostListener, inject, Input, Output } from '@angular/core';
import { RoundBtnComponent } from '../round-btn/round-btn.component';
import { Channel } from '../../models/channel.class';
import { ChannelService } from '../../services/channel.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { User } from '../../models/user.class';

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
  channelService = inject(ChannelService);

  isEditingName = false;
  isEditingDescription = false;
  // isScreenUnder1512 = false;
  isScreenUnder1010 = false;
  // isScreenUnder1512 = false;

  editedName = '';
  editedDescription = '';

  @HostListener('window:resize', [])
  onResize() {
    // this.isScreenUnder1512 = window.innerWidth < 1512;
    this.isScreenUnder1010 = window.innerWidth < 1010;
  }

  ngOnInit() {
    if (this.channelId) {
      this.channelService.getChannelById(this.channelId).subscribe(channel => {
        this.channel = channel;
        this.editedName = channel?.name ?? '';
        this.editedDescription = channel?.description ?? '';
      });
    }
  }

  handleClose() {
    this.close.emit();
  }

  toggleEditName() {
    if (this.isEditingName && this.channel) {
      if (this.editedName && this.editedName !== this.channel.name) {
        this.channelService.updateChannel(this.channel.id, { name: this.editedName })
          .then(() => {
            this.channel!.name = this.editedName;
          });
      }
    }
    this.isEditingName = !this.isEditingName;
  }

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

  async leaveChannel() {
    if (!this.channel || !this.currentUserId) return;

    const updatedParticipants = this.channel.participants?.filter(id => id !== this.currentUserId) || [];

    try {
      if (updatedParticipants.length === 0) {
        await this.channelService.deleteChannel(this.channel.id);
        this.channelDeleted.emit();
        this.handleClose();
        return;
      }
      await this.channelService.updateChannel(this.channel.id, { participants: updatedParticipants });
      this.handleClose();

    } catch (error) {
      console.error('Fehler beim Verlassen des Channels:', error);
    }
  }

  handleOpenProfile(user: User) {
    this.openProfile.emit(user);
  }

  handleOpenAddUser() {
    this.openAddUserResponsive.emit();
  }
}
