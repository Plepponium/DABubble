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
  animationClass = '';

  @Input() user!: User;
  @Output() close = new EventEmitter<void>();

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
