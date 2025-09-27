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
  @Output() close = new EventEmitter<void>();
  userService = inject(UserService)

  currentUser$ = this.userService.getCurrentUser();

  selectedImg?: string;
  showImgPicker = false;
  animationClass = '';
  availableIcons = ['icon1', 'icon2', 'icon3', 'icon4', 'icon5', 'icon6'];


  handleClose() {
    this.close.emit();
  }

  toggleImgPicker() {
    this.showImgPicker = !this.showImgPicker;
  }

  selectImg(icon: string) {
    this.selectedImg = icon;
    this.showImgPicker = false;
  }

  resetImg() {
    this.selectedImg = 'default-user';
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
