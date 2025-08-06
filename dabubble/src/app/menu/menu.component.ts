import {ChangeDetectionStrategy, Component, signal} from '@angular/core';
import { CommonModule } from '@angular/common';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {MatToolbarModule} from '@angular/material/toolbar';
import {MatSidenavModule} from '@angular/material/sidenav';

@Component({
  selector: 'app-menu',
  imports: [CommonModule, MatIconModule, MatSidenavModule, MatButtonModule, MatToolbarModule],
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuComponent {
  readonly panelOpenState = signal(false);
  channelsExpanded = true;
  usersExpanded = true;

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
