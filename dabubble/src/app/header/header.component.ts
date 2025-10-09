import { Component, EventEmitter, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { User } from '../../models/user.class';
import { UserService } from '../../services/user.service';
import { Observable } from 'rxjs';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-header',
  imports: [MatIconModule, MatButtonModule, CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {

  @Output() openLogoutOverlay = new EventEmitter<void>();
  @Output() openUserProfile = new EventEmitter<void>();

  currentUser$: Observable<User | undefined>;

  constructor(private userService: UserService, private router: Router) {
    this.currentUser$ = this.userService.getCurrentUser();
  }

  getAvatarImg(user?: User): string {
    return user?.img || 'default-user';
  }

  openDialogueLogout() {
    this.openLogoutOverlay.emit();
  }

  openProfileFromHeader() {
    this.openUserProfile.emit();
  }

  logout() {
    this.userService.logout().then(() => {
      this.router.navigate(['/']);
    });
  }
}
