import { Component, Output, EventEmitter, Input, inject, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { RoundBtnComponent } from '../round-btn/round-btn.component';
import { DialogueOverlayComponent } from '../dialogue-overlay/dialogue-overlay.component';
import { ProfileOverlayComponent } from '../profile-overlay/profile-overlay.component';
import { ChatAddUserOverlayComponent } from '../chat-add-user-overlay/chat-add-user-overlay.component';
import { ChannelDescriptionOverlayComponent } from '../channel-description-overlay/channel-description-overlay.component';
import { ChannelService } from '../../services/channel.service';
import { UserService } from '../../services/user.service';
// import { User } from 'firebase/auth';
import { User } from '../../models/user.class';
import { switchMap } from 'rxjs';

@Component({
  selector: 'app-chats',
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatIconModule, MatButtonModule, RoundBtnComponent, DialogueOverlayComponent, ProfileOverlayComponent, ChatAddUserOverlayComponent, ChannelDescriptionOverlayComponent],
  templateUrl: './chats.component.html',
  styleUrl: './chats.component.scss',
  // providers: [ChannelService],
})
export class ChatsComponent {
  value = 'Clear me';
  showChannelDescription = false;
  showUserDialogue = false;
  showAddDialogue = false;
  usersDisplayActive = false;
  showProfileDialogue = false;
  editCommentDialogueExpanded = false;
  channelName = '';
  participantIds: string[] = [];
  participants: User[] = [];

  channelService = inject(ChannelService);
  userService = inject(UserService);

  @Input() channelId?: string;
  @Output() openThread = new EventEmitter<void>();


  ngOnInit() {
    // Wenn noch keine channelId gesetzt wurde, lade alle Channels und nimm den ersten
    if (!this.channelId) {
      this.channelService.getChannels().subscribe(channels => {
        if (channels.length > 0) {
          this.channelId = channels[0].id;
          this.channelName = channels[0].name;
          this.participantIds = channels[0].participants;
          // let x = this.userService.getUsersByIds(this.participantIds);
          console.log('onInit participantIds', this.participantIds);
        }
      });
    }
  }

  // ngOnChanges(changes: SimpleChanges) {
  //   if (changes['channelId'] && this.channelId) {
  //     this.channelService.getChannelById(this.channelId).subscribe(channel => {
  //       this.channelName = channel?.name ?? '';
  //       this.participantIds = channel?.participants ?? [];
  //       // let x = this.userService.getUsersByIds(this.participantIds);
  //       // console.log(x);
  //       // console.log('onChanges',this.participants);
  //       console.log(this.participantIds);
  //     });
  //   }
  // }
  ngOnChanges(changes: SimpleChanges) {
    if (changes['channelId'] && this.channelId) {
      this.channelService.getChannelById(this.channelId).pipe(
        switchMap(channel => {
          this.channelName = channel?.name ?? '';
          this.participantIds = channel?.participants ?? [];
          console.log('onChanges participantIds', this.participantIds);
          return this.userService.getUsersByIds(this.participantIds);
        })
      ).subscribe(users => {
        this.participants = users;
        console.log('onChanges users', users);
        // this.participants = users.slice(0, 3);
        console.log('onChanges participants', this.participants);
      });
    }
  }

  openDialogChannelDescription() {
    this.showChannelDescription = true;
  };

  closeDialogChannelDescription() {
    this.showChannelDescription = false;
  }

  openDialogueShowUser() {
    this.showUserDialogue = true;
    this.usersDisplayActive = true;
  }

  closeDialogueShowUser() {
    this.showUserDialogue = false;
    if (this.showAddDialogue = false) {
      this.usersDisplayActive = false;
    }
  }

  openDialogueAddUser() {
    this.showAddDialogue = true;
    this.showUserDialogue = false;
  }

  closeDialogueAddUser() {
    this.showAddDialogue = false;
    this.usersDisplayActive = false;
  }

  openDialogueShowProfile() {
    this.showProfileDialogue = true;
  }

  closeDialogueShowProfile() {
    this.showProfileDialogue = false;
  }


  //zum speichern von time in firebase (noch nicht in Verwendung)
  handleAddChatToChannel() {
    const date = new Date('2024-05-08T12:13:00Z'); // Z für UTC
    const unixTimestamp = Math.floor(date.getTime() / 1000);
    console.log(unixTimestamp); // 1702061580
  }

  addToChats() { }

  handleOpenThread() {
    this.openThread.emit();
  }

  openEditCommentDialogue() {
    this.editCommentDialogueExpanded = !this.editCommentDialogueExpanded;
  }
}
