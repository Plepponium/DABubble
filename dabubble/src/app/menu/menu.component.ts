import { ChangeDetectorRef, ChangeDetectionStrategy, Component, signal, OnInit, Output, EventEmitter, inject } from '@angular/core';
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
  activeUserId?: string;
  // showAddChannelDialogue = false;
  @Output() openAddChannel = new EventEmitter<void>();

  userService = inject(UserService);
  channelService = inject(ChannelService)

  currentUser$ = this.userService.currentUser$;
  users$ = this.userService.getUsers();


  constructor(private cdr: ChangeDetectorRef) { }

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

    this.channelService.getChatsForChannel(channel.id).subscribe(chats => {
    console.log(chats);
  });
  }

  trackByChannelId(index: number, channel: Channel): string {
    return channel.id;
  }

  handleOpenAddChannel(event: Event) {
    event.stopPropagation(); // Verhindert, dass das click-Event der list-header-container ausgelöst wird
    // this.showAddChannelDialogue = true;
    this.openAddChannel.emit();
  }

  // closeAddChannel() {
  //   this.showAddChannelDialogue = false;
  // }

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
