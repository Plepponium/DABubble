import { Component, EventEmitter, HostListener, inject, Input, Output, SimpleChanges } from '@angular/core';
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
  @Output() channelCreated = new EventEmitter<any>();
  @Input() channel!: any;
  @Input() currentUser?: User;

  allUsers: Partial<User>[] = [];
  searchText = '';
  selectedMode: 'all' | 'custom' | null = null;
  selectedUser: Partial<User> | null = null;
  firstUserChannel: any = null;

  userService = inject(UserService);
  channelService = inject(ChannelService);

  showOverlayResponsive = false;
  private isResponsive = false;

  ngOnInit() {
    this.isResponsive = window.innerWidth < 880;
    // this.showOverlayResponsive = this.isResponsive;
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

  ngAfterViewInit() {
    // ✅ DOM ist fertig → JETZT animieren
    setTimeout(() => {
      if (this.isResponsive) {
        this.showOverlayResponsive = true;
      }
    }, 10);  // Minimale Verzögerung für CSS-Transition
  }

  @HostListener('window:resize', [])
  onResize() {
    this.isResponsive = window.innerWidth < 880;
    // if (this.isOverlayVisible()) {
    this.showOverlayResponsive = this.isResponsive;
    // }
  }

  handleClose() {
    // this.close.emit();
    if (this.isResponsive) {
      this.showOverlayResponsive = false;
      setTimeout(() => this.close.emit(), 350);
    } else {
      this.close.emit();
    }
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
    if (!this.channel || !this.currentUser) return;
    if (this.isCreateDisabled()) return;
    let extraParticipants: string[] = [];
    if (this.selectedMode === 'all' && this.firstUserChannel) {
      extraParticipants = this.firstUserChannel.participants;
    }
    if (this.selectedMode === 'custom' && this.selectedUser?.uid) {
      extraParticipants = [this.selectedUser.uid];
    }
    const baseParticipants = this.channel.participants || [this.currentUser.uid];
    const allParticipants = Array.from(new Set([...baseParticipants, ...extraParticipants]));
    const newChannelData = {
      ...this.channel,
      participants: allParticipants
    };
    const channelRef = await this.channelService.addChannel(newChannelData);
    this.channelCreated.emit({ id: channelRef.id, ...newChannelData });
    this.handleClose();
  }

}
