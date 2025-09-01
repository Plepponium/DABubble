import { Component, Output} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { User } from '../../models/user.class';
import { UserService } from '../../services/user.service';
import { Observable } from 'rxjs';
import { CommonModule } from '@angular/common';
import { LogoutOverlayComponent } from '../logout-overlay/logout-overlay.component';

@Component({
  selector: 'app-header',
  imports: [MatIconModule, MatButtonModule, CommonModule, LogoutOverlayComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  showLogoutDialogue = false;
  currentUser$: Observable<User | undefined>;

  constructor(private userService: UserService) {
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

  openDialogueUserProfile() {}

  logout() {}
}
