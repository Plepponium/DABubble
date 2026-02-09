import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Observable, of } from 'rxjs';
import { DialogueOverlayComponent } from '../dialogue-overlay/dialogue-overlay.component';
import { ChatAddUserOverlayComponent } from '../chat-add-user-overlay/chat-add-user-overlay.component';
import { ChannelDescriptionOverlayComponent } from '../channel-description-overlay/channel-description-overlay.component';
import { User } from '../../models/user.class';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-channel-header',
  imports: [CommonModule, DialogueOverlayComponent, ChatAddUserOverlayComponent, ChannelDescriptionOverlayComponent],
  templateUrl: './channel-header.component.html',
  styleUrl: './channel-header.component.scss'
})
export class ChannelHeaderComponent {
  showChannelDescription = false;
  showUserDialogue = false;
  usersDisplayActive = false;
  showAddDialogue = false;
  showAddDialogueResponsive = false;

  // currentUserId: string = '';
  // participants: User[] = [];

  // channelName$: Observable<string> = of('');
  // participants$: Observable<User[]> = of([]);

  @Input() currentUserId!: string; 
  @Input() participants!: User[];   
  @Input() channelName$!: Observable<string>; 
  @Input() participants$!: Observable<User[]>;
  @Input() channelId?: string;
  @Input() profileOpen = false;
  @Output() openProfile = new EventEmitter<User>();
  @Output() channelDeleted = new EventEmitter<void>();

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

  chooseOpenDialogue() {
    if (window.innerWidth <= 1010) {
      this.openDialogueShowUser();
    } else {
      this.openDialogueAddUser();
    }
  }

  openDialogueAddUser() {
    this.showAddDialogue = true;
    this.showAddDialogueResponsive = false;
    this.showUserDialogue = false;
  }

  openDialogueAddUserResponsive() {
    this.showAddDialogue = true;
    this.showAddDialogueResponsive = true;
  }

  closeDialogueAddUser() {
    this.showAddDialogue = false;
    this.showAddDialogueResponsive = false;
    this.usersDisplayActive = false;
  }

  // openDialogueShowProfile(user: User) {
  //   this.profileOpen = true;
  //   this.openProfile.emit(user);
  // }
  openDialogueShowProfile(user: User) {
    this.openProfile.emit(user); // ✅ Parent managed profileOpen
  }

  handleChannelDeleted() {
    this.channelDeleted.emit();
    this.closeDialogChannelDescription();
  }
}
