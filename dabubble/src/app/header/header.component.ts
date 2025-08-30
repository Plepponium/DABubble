import { Component, } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { User } from '../../models/user.class';
import { UserService } from '../../services/user.service';
import { Observable } from 'rxjs';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-header',
  imports: [MatIconModule, MatButtonModule, CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  currentUser$: Observable<User | undefined>;

  constructor(private userService: UserService) {
    this.currentUser$ = this.userService.getCurrentUser();
  }

  getAvatarImg(user?: User): string {
    return user?.img || 'default-user';
  }
}
