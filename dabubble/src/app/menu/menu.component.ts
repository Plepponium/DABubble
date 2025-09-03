import { ChangeDetectorRef, ChangeDetectionStrategy, Component, signal, OnInit } from '@angular/core';
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
import { ChannelService } from '../../services/channel.service';
import { Channel } from '../../models/channel.class';

@Component({
  selector: 'app-menu',
  imports: [CommonModule, MatIconModule, MatSidenavModule, MatButtonModule, MatToolbarModule, RoundBtnComponent, FormsModule, RouterModule],
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.scss',
  providers: [UserService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuComponent implements OnInit {
  readonly panelOpenState = signal(false);
  channelsExpanded = true;
  channels: Channel[] = [];
  activeChannelId?: string;
  usersExpanded = true;
  users$: Observable<User[]>;
  activeUserId?: string;
  showAddChannelDialogue = false;

  constructor(private channelService: ChannelService, private userService: UserService,
    private cdr: ChangeDetectorRef) {
    this.users$ = this.userService.getUsers();
  }

  ngOnInit() {
    this.channelService.getChannels().subscribe(data => {
      this.channels = data;
      this.cdr.markForCheck();
    });

    this.users$.subscribe(() => {
      this.cdr.markForCheck();
    });
  }

  toggleChannels() {
    this.channelsExpanded = !this.channelsExpanded;
  }

  openChannel(channel: Channel) {
    this.activeChannelId = channel.id;
    this.activeUserId = '';
  }

  trackByChannelId(index: number, channel: Channel): string {
    return channel.id;
  }

  openAddChannel(event: Event) {
    event.stopPropagation(); // Verhindert, dass das click-Event der list-header-container ausgelöst wird
    this.showAddChannelDialogue = true;
  }

  closeAddChannel() {
    this.showAddChannelDialogue = false;
  }

  toggleUsers() {
    this.usersExpanded = !this.usersExpanded;
  }

  openUserChat(user: User) {
    this.activeUserId = user.uid;
    this.activeChannelId = '';
  }

  trackByUserId(index: number, user: User): string {
    return user.uid;
  }
}
