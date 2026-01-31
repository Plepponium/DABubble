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

  /**
  * Emits the close event to signal that the component should be closed.
  */
  handleClose() {
    this.close.emit();
  }

  /**
  * Toggles the visibility of the image picker.
  */
  toggleImgPicker() {
    this.showImgPicker = !this.showImgPicker;
  }

  /**
  * Selects an image icon and hides the image picker.
  * @param {string} icon - The name or path of the selected image icon.
  */
  selectImg(icon: string) {
    this.selectedImg = icon;
    this.showImgPicker = false;
  }

  /**
  * Resets the selected image to the default user image.
  */
  resetImg() {
    this.selectedImg = 'default-user';
  }

  /**
  * Validates the edited name.
  * @returns {boolean} True if the name contains at least two separate words, otherwise false.
  */
  isNameValid(): boolean {
    const trimmedName = this.editedName?.trim();
    return !!trimmedName && trimmedName.split(/\s+/).length >= 2;
  }

  /**
  * Saves the edited user data to the database.
  * Updates the user's name and image if changes were made, then closes the dialog.
  * @async
  * @returns {Promise<void>} Resolves when the save operation is complete.
  */
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

}
