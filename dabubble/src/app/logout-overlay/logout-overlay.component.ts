import { CommonModule } from '@angular/common';
import { Component, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-logout-overlay',
  imports: [CommonModule],
  templateUrl: './logout-overlay.component.html',
  styleUrl: './logout-overlay.component.scss'
})
export class LogoutOverlayComponent {
  @Output() close = new EventEmitter<void>();
  @Output() openUser = new EventEmitter<void>();
  @Output() logout = new EventEmitter<void>();

  handleClose() {
    this.close.emit();
  }

  handleOpenUserProfile() {
    this.openUser.emit();
  }

  handleLogout() {
    this.logout.emit();
  }
}
