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
  @Output() close = new EventEmitter<void>();
  @Output() openEdit = new EventEmitter<void>();
  @Input() private userService = inject(UserService)

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