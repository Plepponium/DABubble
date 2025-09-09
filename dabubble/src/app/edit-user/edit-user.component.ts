import { CommonModule } from '@angular/common';
import { Component, Output, EventEmitter, Input, inject } from '@angular/core';
import { RoundBtnComponent } from '../round-btn/round-btn.component';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-edit-user',
  imports: [CommonModule, RoundBtnComponent],
  templateUrl: './edit-user.component.html',
  styleUrl: './edit-user.component.scss'
})
export class EditUserComponent {
  animationClass = '';

  @Output() close = new EventEmitter<void>();
  userService = inject(UserService)

  currentUser$ = this.userService.currentUser$;

  handleClose() {
    this.close.emit();
  }

  onMouseEnter() {
    // this.animationClass = 'wiggle';
    setTimeout(() => {
      this.animationClass = '';
    }, 100);
  }

  onMouseLeave() {
    // this.animationClass = 'wiggle';
    setTimeout(() => {
      this.animationClass = '';
    }, 100);
  }
}
