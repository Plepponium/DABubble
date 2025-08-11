import { Component } from '@angular/core';
import { AuthLayoutComponent } from '../shared/auth-layout/auth-layout.component';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-signup-avatar',
  imports: [AuthLayoutComponent, RouterLink, CommonModule],
  templateUrl: './signup-avatar.component.html',
  styleUrl: './signup-avatar.component.scss'
})
export class SignupAvatarComponent {
  avatarImages: string[] = [
    'assets/user-icons/icon1.svg',
    'assets/user-icons/icon2.svg',
    'assets/user-icons/icon3.svg',
    'assets/user-icons/icon4.svg',
    'assets/user-icons/icon5.svg',
    'assets/user-icons/icon6.svg'
  ];

  selectedAvatar: string = 'assets/user-icons/default-user.svg';

  showOverlay = false;
  overlayVariant: 'login' | 'created' | 'sent' = 'created';

  constructor(private router: Router) { }

  selectAvatar(avatar: string): void {
    this.selectedAvatar = avatar;
  }

  register() {
    this.overlayVariant = 'created';
    this.showOverlay = true;

    setTimeout(() => {
      this.showOverlay = false;
      this.router.navigate(['/']);
    }, 1500);
  }

}
