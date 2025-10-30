import { CommonModule } from '@angular/common';
import { Component, Output, EventEmitter, Input, inject, OnInit } from '@angular/core';
import { RoundBtnComponent } from '../round-btn/round-btn.component';
import { User } from '../../models/user.class';
import { UserService } from '../../services/user.service';
import { MentionsOverlayComponent } from '../shared/mentions-overlay/mentions-overlay.component';
import { FormsModule } from '@angular/forms';
import { ChannelService } from '../../services/channel.service';

@Component({
  selector: 'app-chat-add-user-overlay',
  imports: [CommonModule, FormsModule, RoundBtnComponent, MentionsOverlayComponent],
  templateUrl: './chat-add-user-overlay.component.html',
  styleUrl: './chat-add-user-overlay.component.scss'
})
export class ChatAddUserOverlayComponent {
  @Input() channelName: string | null = '';
  @Input() channelId?: string;
  @Input() currentUserId!: string;
  @Input() participants: Partial<User>[] = [];
  @Output() close = new EventEmitter<void>();


  searchText = '';
  allUsers: Partial<User>[] = [];
  selectedUser: Partial<User> | null = null;

  userService = inject(UserService);
  channelService = inject(ChannelService);


  ngOnInit() {
    this.loadAllUsers();
  }

  loadAllUsers() {
    this.userService.getUsers().subscribe({
      next: (users) => {
        this.allUsers = users
          .filter(u => u.uid !== this.currentUserId)
          .filter(u => !this.participants.some(p => p.uid === u.uid));
      },
      error: (err) => console.error('Fehler beim Laden der Benutzer:', err)
    });
  }


  selectUser(event: { name: string }) {
    this.selectedUser = this.allUsers.find(u => u.name === event.name) || null;
    this.searchText = '';
  }

  removeUser() {
    this.selectedUser = null;
    this.searchText = '';
  }

  async addUserToChannel() {
    if (!this.channelId || !this.selectedUser?.uid) return;
    try {
      await this.channelService.addParticipants(this.channelId, [this.selectedUser.uid]);
      this.participants.push(this.selectedUser);
      this.selectedUser = null;
      this.searchText = '';
      this.close.emit();
    } catch (err) {
      console.error('Fehler beim Hinzufügen des Users:', err);
    }
  }



  handleClose() {
    this.close.emit();
  }
}
