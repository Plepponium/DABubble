import { CommonModule } from '@angular/common';
import { Component, Output, EventEmitter, Input, inject } from '@angular/core';
import { RoundBtnComponent } from '../round-btn/round-btn.component';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-user-profile',
  imports: [CommonModule, RoundBtnComponent],
  templateUrl: './user-profile.component.html',
  styleUrl: './user-profile.component.scss'
})
export class UserProfileComponent {

  /** Emits when the component requests to be closed. */
  @Output() close = new EventEmitter<void>();
  /** Emits when the edit mode should be opened. */
  @Output() openEdit = new EventEmitter<void>();
  /** Provides access to the current user service instance. */
  @Input() private userService = inject(UserService)

  /** Observable stream of the currently authenticated user. */
  currentUser$ = this.userService.getCurrentUser();

  /** Emits the close event to the parent component. */
  handleClose() {
    this.close.emit();
  }

  /** Emits the open-edit event to the parent component. */
  handleOpenEdit() {
    this.openEdit.emit();
  }
}