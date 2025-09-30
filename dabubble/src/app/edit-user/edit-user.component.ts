import { CommonModule } from '@angular/common';
import { Component, Output, EventEmitter, Input, inject } from '@angular/core';
import { RoundBtnComponent } from '../round-btn/round-btn.component';
import { UserService } from '../../services/user.service';
import { User } from '../../models/user.class';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-edit-user',
  imports: [CommonModule, RoundBtnComponent, FormsModule],
  templateUrl: './edit-user.component.html',
  styleUrl: './edit-user.component.scss'
})
export class EditUserComponent {
  @Output() close = new EventEmitter<void>();
  userService = inject(UserService)

  currentUser$ = this.userService.getCurrentUser();

  editedName: string = '';
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

  isNameValid(): boolean {
    const trimmedName = this.editedName?.trim();
    return !!trimmedName && trimmedName.split(/\s+/).length >= 2;
  }


  async handleSave() {
    const user = await firstValueFrom(this.currentUser$);
    if (!user) return;

    const updatedData: Partial<User> = {
      name: this.editedName || user.name,
      img: this.selectedImg || user.img
    };

    await this.userService.updateUser(user.uid, updatedData);
    this.handleClose();
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
