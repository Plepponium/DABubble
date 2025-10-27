import { CommonModule } from '@angular/common';
import { Component, Output, EventEmitter, Input, inject, OnInit } from '@angular/core';
import { RoundBtnComponent } from '../round-btn/round-btn.component';
import { User } from '../../models/user.class';
import { UserService } from '../../services/user.service';
import { MentionsOverlayComponent } from '../shared/mentions-overlay/mentions-overlay.component';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-chat-add-user-overlay',
  imports: [CommonModule, FormsModule, RoundBtnComponent, MentionsOverlayComponent],
  templateUrl: './chat-add-user-overlay.component.html',
  styleUrl: './chat-add-user-overlay.component.scss'
})
export class ChatAddUserOverlayComponent {
  @Input() channelName: string | null = '';
  @Output() close = new EventEmitter<void>();


  searchText = '';
  allUsers: Partial<User>[] = [];
  selectedUser: Partial<User> | null = null;

  userService = inject(UserService);

  ngOnInit() {
    this.loadAllUsers();
  }

  loadAllUsers() {
    this.userService.getUsers().subscribe({
      next: (users) => {
        console.log('Geladene User:', users);
        this.allUsers = users;
      },
      error: (err) => console.error('Fehler beim Laden der Benutzer:', err)
    });
  }



  selectUser(event: { name: string }) {
    this.selectedUser = this.allUsers.find(u => u.name === event.name) || null;
    this.searchText = event.name;
  }

  handleClose() {
    this.close.emit();
  }
}
