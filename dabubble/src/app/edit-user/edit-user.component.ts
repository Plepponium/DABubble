import { CommonModule } from '@angular/common';
import { Component, Output, EventEmitter } from '@angular/core';
import { RoundBtnComponent } from '../round-btn/round-btn.component';

@Component({
  selector: 'app-edit-user',
  imports: [CommonModule, RoundBtnComponent],
  templateUrl: './edit-user.component.html',
  styleUrl: './edit-user.component.scss'
})
export class EditUserComponent {
   animationClass = '';

  // @Input() isOpen = false;              // wird von außen gesetzt
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
