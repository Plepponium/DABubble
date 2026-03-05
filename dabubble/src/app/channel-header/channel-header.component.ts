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
  @Input() currentUserId!: string;
  @Input() participants!: User[];
  @Input() channelName$!: Observable<string>;
  @Input() participants$!: Observable<User[]>;
  @Input() channelId?: string;
  @Input() profileOpen = false;
  @Output() openProfile = new EventEmitter<User>();
  @Output() channelDeleted = new EventEmitter<void>();

  showChannelDescription = false;
  showUserDialogue = false;
  usersDisplayActive = false;
  showAddDialogue = false;
  showAddDialogueResponsive = false;

  /** Opens the channel description dialog. */
  openDialogChannelDescription() {
    this.showChannelDescription = true;
  };

  /** Closes the channel description dialog. */
  closeDialogChannelDescription() {
    this.showChannelDescription = false;
  }

  /** Opens the user dialogue panel. */
  openDialogueShowUser() {
    this.showUserDialogue = true;
    this.usersDisplayActive = true;
  }

  /** Closes the user dialogue panel. */
  closeDialogueShowUser() {
    this.showUserDialogue = false;
    if (this.showAddDialogue = false) {
      this.usersDisplayActive = false;
    }
  }

  /** Chooses which dialogue to open based on window width. */
  chooseOpenDialogue() {
    if (window.innerWidth <= 1010) {
      this.openDialogueShowUser();
    } else {
      this.openDialogueAddUser();
    }
  }

  /** Opens the add user dialogue. */
  openDialogueAddUser() {
    this.showAddDialogue = true;
    this.showAddDialogueResponsive = false;
    this.showUserDialogue = false;
  }

  /** Opens the responsive add user dialogue. */
  openDialogueAddUserResponsive() {
    this.showAddDialogue = true;
    this.showAddDialogueResponsive = true;
  }

  /** Closes the add user dialogue. */
  closeDialogueAddUser() {
    this.showAddDialogue = false;
    this.showAddDialogueResponsive = false;
    this.usersDisplayActive = false;
  }

  /** Emits event to open a user profile. */
  openDialogueShowProfile(user: User) {
    this.openProfile.emit(user);
  }

  /** Emits event when the channel is deleted. */
  handleChannelDeleted() {
    this.channelDeleted.emit();
    this.closeDialogChannelDescription();
  }
}
