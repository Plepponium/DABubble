import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RoundBtnComponent } from '../round-btn/round-btn.component';

@Component({
  selector: 'app-dialogue-overlay',
  imports: [CommonModule, RoundBtnComponent],
  templateUrl: './dialogue-overlay.component.html',
  styleUrl: './dialogue-overlay.component.scss'
})
export class DialogueOverlayComponent {
  // @Input() isOpen = false;              
  @Output() close = new EventEmitter<void>();
  @Output() openProfile = new EventEmitter<void>();
  @Output() openAddUser = new EventEmitter<void>();

  handleClose() {
    this.close.emit();
  }

  handleOpenProfile() {
    this.openProfile.emit();
  }

  handleOpenAddUser() {
    this.openAddUser.emit();
  }
}
