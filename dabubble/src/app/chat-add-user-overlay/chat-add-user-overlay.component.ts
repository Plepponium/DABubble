import { CommonModule } from '@angular/common';
import { Component, Output, EventEmitter, Input, inject, OnInit, ViewChild, ElementRef } from '@angular/core';
import { RoundBtnComponent } from '../round-btn/round-btn.component';
import { User } from '../../models/user.class';
import { UserService } from '../../services/user.service';
import { MentionsOverlayComponent } from '../shared/mentions-overlay/mentions-overlay.component';
import { FormsModule } from '@angular/forms';
import { ChannelService } from '../../services/channel.service';
import { takeUntil } from 'rxjs/internal/operators/takeUntil';
import { LogoutService } from '../../services/logout.service';

@Component({
  selector: 'app-chat-add-user-overlay',
  imports: [CommonModule, FormsModule, RoundBtnComponent, MentionsOverlayComponent],
  templateUrl: './chat-add-user-overlay.component.html',
  styleUrl: './chat-add-user-overlay.component.scss'
})
export class ChatAddUserOverlayComponent {

  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;
  @Input() channelName: string | null = '';
  @Input() channelId?: string;
  @Input() currentUserId!: string;
  @Input() participants: Partial<User>[] = [];
  @Input() isResponsive = false;
  @Output() close = new EventEmitter<void>();

  searchText = '';
  allUsers: Partial<User>[] = [];
  selectedUser: Partial<User> | null = null;
  showOverlayResponsive = true;

  userService = inject(UserService);
  channelService = inject(ChannelService);
  logoutService = inject(LogoutService);
  private destroy$ = this.logoutService.logout$;


  /**
  * Initializes the component and loads all available users.
  */
  ngOnInit() {
    this.loadAllUsers();
  }

  /**
  * Sets focus to the search input field after view initialization.
  */
  ngAfterViewInit() {
    setTimeout(() => {
      this.searchInput?.nativeElement?.focus();
    });
  }

  /**
  * Loads all users from the service and filters out the current user and existing participants.
  */
  loadAllUsers() {
    this.userService.getUsers().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (users) => {
        this.allUsers = users
          .filter(u => u.uid !== this.currentUserId)
          .filter(u => !this.participants.some(p => p.uid === u.uid));
      },
      error: (err) => console.error('Fehler beim Laden der Benutzer:', err)
    });
  }

  /**
  * Selects a user from the search results.
  * 
  * @param {Object} event - Event object containing the selected user's name
  * @param {string} event.name - The name of the selected user
  */
  selectUser(event: { name: string }) {
    this.selectedUser = this.allUsers.find(u => u.name === event.name) || null;
    this.searchText = '';
  }

  /**
  * Removes the currently selected user and clears the search text.
  */
  removeUser() {
    this.selectedUser = null;
    this.searchText = '';
  }

  /**
  * Adds the selected user to the channel.
  * 
  * @async
  * @returns {Promise<void>}
  * @throws Will log an error if the user cannot be added to the channel
  */
  async addUserToChannel() {
    if (!this.channelId || !this.selectedUser?.uid) return;
    try {
      await this.channelService.addParticipants(this.channelId, [this.selectedUser.uid]);
      this.participants.push(this.selectedUser);
      this.selectedUser = null;
      this.searchText = '';
      this.handleClose();
    } catch (err) {
      console.error('Fehler beim Hinzufügen des Users:', err);
    }
  }

  /**
  * Closes the overlay and emits the close event.
  */
  handleClose() {
    this.isResponsive = false;
    this.close.emit();
  }
}
