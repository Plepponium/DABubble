import { Component, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RoundBtnComponent } from '../round-btn/round-btn.component';
import { User } from '../../models/user.class';

@Component({
  selector: 'app-dialogue-overlay',
  imports: [CommonModule, RoundBtnComponent],
  templateUrl: './dialogue-overlay.component.html',
  styleUrl: './dialogue-overlay.component.scss'
})
export class DialogueOverlayComponent {
  @Input() currentUserId?: string;
  @Input() participants: User[] = [];
  @Output() close = new EventEmitter<void>();
  @Output() openProfile = new EventEmitter<User>();
  @Output() openAddUser = new EventEmitter<void>();

  /**
  * Closes the overlay by emitting the close event.
  */
  handleClose() {
    this.close.emit();
  }

  /**
  * Opens the profile of the selected user.
  * 
  * @param {User} user - The user whose profile should be opened
  */
  handleOpenProfile(user: User) {
    this.openProfile.emit(user);
  }

  /**
  * Triggers the add user overlay.
  */
  handleOpenAddUser() {
    this.openAddUser.emit();
  }
}
