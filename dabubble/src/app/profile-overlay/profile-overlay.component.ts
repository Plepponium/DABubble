import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RoundBtnComponent } from '../round-btn/round-btn.component';

@Component({
  selector: 'app-profile-overlay',
  imports: [CommonModule, RoundBtnComponent],
  templateUrl: './profile-overlay.component.html',
  styleUrl: './profile-overlay.component.scss'
})
export class ProfileOverlayComponent {
  // @Input() isOpen = false;              // wird von außen gesetzt
  @Output() close = new EventEmitter<void>();

  handleClose() {
    this.close.emit();
  }
}
