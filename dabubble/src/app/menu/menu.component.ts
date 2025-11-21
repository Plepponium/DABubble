import { ChangeDetectorRef, ChangeDetectionStrategy, Component, signal, OnInit, Output, EventEmitter, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { RoundBtnComponent } from '../round-btn/round-btn.component';
import { UserService } from '../../services/user.service';
import { combineLatest, map, Observable } from 'rxjs';
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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuComponent implements OnInit {
  readonly panelOpenState = signal(false);
  channelsExpanded = true;
  channels: Channel[] = [];
  // activeChannelId?: string;
  usersExpanded = true;
  // activeUserId?: string;
  // showAddChannelDialogue = false;

  @Input() activeChannelId?: string;
  @Input() activeUserId?: string;

  @Output() openNewMessage = new EventEmitter<string>();
  @Output() openAddChannel = new EventEmitter<void>();
  @Output() openChannel = new EventEmitter<string>();
  @Output() openUserChat = new EventEmitter<User>();

  userService = inject(UserService);
  channelService = inject(ChannelService);

  currentUser$ = this.userService.getCurrentUser();
  users$ = this.userService.getUsers();

  sortedUsers$ = combineLatest([this.users$, this.currentUser$]).pipe(
    map(([users, currentUser]) => {
      if (!currentUser) return users;
      return [...users].sort((a, b) => {
        if (a.uid === currentUser.uid) return -1;
        if (b.uid === currentUser.uid) return 1;
        return 0;
      });
    })
  );


  constructor(private cdr: ChangeDetectorRef) { }

  ngOnInit() {
    this.getChannels();
  }

  private getChannels() {
    this.channelService.getChannels().subscribe(data => {
      this.channels = [...data];
      this.sortChannels();
      this.cdr.markForCheck();
    });
  }

  private sortChannels() {
    this.channels.sort((a, b) => {
      const aDate = a.createdAt ? this.toDate(a.createdAt) : null;
      const bDate = b.createdAt ? this.toDate(b.createdAt) : null;
      if (!aDate && !bDate) return 0;
      if (!aDate) return -1;
      if (!bDate) return 1;
      return aDate.getTime() - bDate.getTime();
    });
  }

  private toDate(value: any): Date {
    if (value?.seconds) return new Date(value.seconds * 1000 + value.nanoseconds / 1e6);
    return new Date(value);
  }


  toggleChannels() {
    this.channelsExpanded = !this.channelsExpanded;
  }

  // trackByChannelId(index: number, channel: Channel): string {
  //   return channel.id;
  // }

  handleOpenNewMessage() {
    this.openNewMessage.emit()
  }

  handleOpenAddChannel(event: Event) {
    event.stopPropagation();
    this.openAddChannel.emit();
  }

  handleOpenChannel(channel: Channel) {
    this.activeChannelId = channel.id;
    this.activeUserId = '';
    this.openChannel.emit(channel.id);
  }

  toggleUsers() {
    this.usersExpanded = !this.usersExpanded;
  }

  handleOpenUserChat(user: User) {
    this.activeUserId = user.uid;
    this.activeChannelId = '';
    this.openUserChat.emit(user);
  }

  trackByUserId(index: number, user: User): string {
    return user.uid;
  }
}
