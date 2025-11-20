import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { RoundBtnComponent } from '../round-btn/round-btn.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MentionsOverlayComponent } from '../shared/mentions-overlay/mentions-overlay.component';
import { User } from '../../models/user.class';
import { UserService } from '../../services/user.service';
import { ChannelService } from '../../services/channel.service';

@Component({
  selector: 'app-add-channel-members-overlay',
  imports: [RoundBtnComponent, CommonModule, FormsModule, MentionsOverlayComponent],
  templateUrl: './add-channel-members-overlay.component.html',
  styleUrl: './add-channel-members-overlay.component.scss'
})
export class AddChannelMembersOverlayComponent {
  @Output() close = new EventEmitter<void>();
  @Input() channel!: any;
  @Input() currentUser?: User;

  allUsers: Partial<User>[] = [];
  searchText = '';
  selectedMode: 'all' | 'custom' | null = null;
  selectedUser: Partial<User> | null = null;
  firstUserChannel: any = null;

  userService = inject(UserService);
  channelService = inject(ChannelService);

  ngOnInit() {
    this.userService.getUsers().subscribe(users => {
      this.allUsers = users;
    });
    this.channelService.getChannels().subscribe(channels => {
      const userChannels = channels.filter(ch => ch.participants.includes(this.currentUser!.uid));
      if (userChannels.length > 0) {
        this.firstUserChannel = userChannels[0];
      }
    });
  }

  handleClose() {
    this.close.emit();
  }

  isCreateDisabled(): boolean {
    if (!this.selectedMode) return true;
    if (this.selectedMode === 'all') return false;
    if (this.selectedMode === 'custom' && !this.selectedUser) return true;
    return false;
  }

  selectUser(event: { name: string }) {
    this.selectedUser = this.allUsers.find(u => u.name === event.name) || null;
    this.searchText = '';
  }

  removeUser() {
    this.selectedUser = null;
    this.searchText = '';
  }

  async handleCreate() {
    if (!this.channel || !this.channel.id) return;
    if (this.isCreateDisabled()) return;

    let participantIds: string[] = [];

    if (this.selectedMode === 'all' && this.firstUserChannel) {
      participantIds = this.firstUserChannel.participants;
    }

    if (this.selectedMode === 'custom' && this.selectedUser?.uid) {
      participantIds = [this.selectedUser.uid];
    }

    if (participantIds.length > 0) {
      await this.channelService.addParticipants(this.channel.id, participantIds);
    }
    this.handleClose();
  }

}
