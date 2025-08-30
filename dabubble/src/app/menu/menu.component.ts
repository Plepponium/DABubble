import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { RoundBtnComponent } from '../round-btn/round-btn.component';
import { UserService } from '../../services/user.service';
import { Observable } from 'rxjs';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { User } from '../../models/user.class';

@Component({
  selector: 'app-menu',
  imports: [CommonModule, MatIconModule, MatSidenavModule, MatButtonModule, MatToolbarModule, RoundBtnComponent, FormsModule, RouterModule],
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.scss',
  providers: [UserService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuComponent {
  readonly panelOpenState = signal(false);
  channelsExpanded = true;
  usersExpanded = true;
  users$: Observable<User[]>;

  constructor(private userService: UserService) {
    this.users$ = this.userService.getUsers();
  }

  toggleChannels() {
    this.channelsExpanded = !this.channelsExpanded;
  }

  addChannel(event: Event) {
    event.stopPropagation(); // Verhindert, dass das click-Event der list-header-container ausgelöst wird
    // Logik zum Hinzufügen eines Channels
  }

  toggleUsers() {
    this.usersExpanded = !this.usersExpanded;
  }
}
