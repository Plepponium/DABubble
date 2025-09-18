import { Component, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { User } from '../../models/user.class';
import { UserService } from '../../services/user.service';
import { Observable } from 'rxjs';
import { CommonModule } from '@angular/common';
import { LogoutOverlayComponent } from '../logout-overlay/logout-overlay.component';
import { UserProfileComponent } from '../user-profile/user-profile.component';
import { EditUserComponent } from '../edit-user/edit-user.component';
import { Router } from '@angular/router';

@Component({
  selector: 'app-header',
  imports: [MatIconModule, MatButtonModule, CommonModule, LogoutOverlayComponent, UserProfileComponent, EditUserComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  showLogoutDialogue = false;
  showUserDialogue = false;
  showEditDialogue = false;
  currentUser$: Observable<User | undefined>;

  constructor(private userService: UserService, private router: Router) {
    this.currentUser$ = this.userService.getCurrentUser();
  }

  getAvatarImg(user?: User): string {
    return user?.img || 'default-user';
  }

  openDialogueLogout() {
    this.showLogoutDialogue = true;
  }

  closeDialogueLogout() {
    this.showLogoutDialogue = false;
  }

  openDialogueUser() {
    this.showUserDialogue = true;
  }

  closeDialogueUser() {
    this.showUserDialogue = false;
  }

  openEditUser() {
    this.showEditDialogue = true;
    this.showUserDialogue = false;
  }

  closeEditUser() {
    this.showEditDialogue = false;
  }

  logout() {
    this.userService.logout().then(() => {
      this.router.navigate(['/']);
    });
  }
}
