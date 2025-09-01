import { CommonModule } from '@angular/common';
import { Component, Output, EventEmitter } from '@angular/core';
import { RoundBtnComponent } from '../round-btn/round-btn.component';

@Component({
  selector: 'app-user-profile',
  imports: [CommonModule, RoundBtnComponent],
  templateUrl: './user-profile.component.html',
  styleUrl: './user-profile.component.scss'
})
export class UserProfileComponent {

  // @Input() isOpen = false;              // wird von außen gesetzt
  @Output() close = new EventEmitter<void>();
  @Output() openEdit = new EventEmitter<void>();

  handleClose() {
    this.close.emit();
  }

  handleOpenEdit() {
    this.openEdit.emit();
  }
}
