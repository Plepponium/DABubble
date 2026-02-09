import { Component, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RoundBtnComponent } from '../round-btn/round-btn.component';
import { User } from '../../models/user.class';

@Component({
  selector: 'app-profile-overlay',
  imports: [CommonModule, RoundBtnComponent],
  templateUrl: './profile-overlay.component.html',
  styleUrl: './profile-overlay.component.scss'
})
export class ProfileOverlayComponent {
  @Input() user!: User;
  @Output() close = new EventEmitter<void>();
  @Output() openDmChat = new EventEmitter<User>();

  /**
   * Handles the click event for the message button.
   * Emits the openDmChat event with the current user as payload.
   */
  onMessageClick() {
    this.openDmChat.emit(this.user);
  }

  /**
  * Handles closing the profile overlay and emits the close event.
  */
  handleClose() {
    this.close.emit();
  }
}
