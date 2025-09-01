import { CommonModule, Output, EventEmitter } from '@angular/common';
import { Component } from '@angular/core';
import { RoundBtnComponent } from '../round-btn/round-btn.component';

@Component({
  selector: 'app-logout-overlay',
  imports: [CommonModule, RoundBtnComponent],
  templateUrl: './logout-overlay.component.html',
  styleUrl: './logout-overlay.component.scss'
})
export class LogoutOverlayComponent {
  @Output() close = new EventEmitter<void>();

  handleClose() {
    this.close.emit();
  }
}
