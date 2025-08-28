import { CommonModule } from '@angular/common';
import { Component, Output, EventEmitter } from '@angular/core';
import { RoundBtnComponent } from '../round-btn/round-btn.component';

@Component({
  selector: 'app-chat-add-user-overlay',
  imports: [CommonModule, RoundBtnComponent],
  templateUrl: './chat-add-user-overlay.component.html',
  styleUrl: './chat-add-user-overlay.component.scss'
})
export class ChatAddUserOverlayComponent {
  animationClass = '';

  // @Input() isOpen = false;              // wird von außen gesetzt
  @Output() close = new EventEmitter<void>();

  handleClose() {
    this.close.emit();
  }

  onMouseEnter() {
    this.animationClass = 'wiggle';
    // Nach 300ms (oder der gewünschten Dauer) zurücksetzen
    setTimeout(() => {
      this.animationClass = '';
    }, 100);
  }

  onMouseLeave() {
    this.animationClass = 'wiggle';
    // Nach 300ms (oder der gewünschten Dauer) zurücksetzen
    setTimeout(() => {
      this.animationClass = '';
    }, 100);
  }
}
