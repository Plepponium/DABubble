import { Component, Output, EventEmitter } from '@angular/core';
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
import { ChannelDescriptionOverlayComponent } from './channel-description-overlay/channel-description-overlay.component';

@Component({
  selector: 'app-chats',
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatIconModule, MatButtonModule, RoundBtnComponent, DialogueOverlayComponent, ProfileOverlayComponent, ChatAddUserOverlayComponent, ChannelDescriptionOverlayComponent],
  templateUrl: './chats.component.html',
  styleUrl: './chats.component.scss'
})
export class ChatsComponent {
  value = 'Clear me';
  showChannelDescription = false;
  showUserDialogue = false;
  showAddDialogue = false;
  usersDisplayActive = false;
  showProfileDialogue = false;
  editCommentDialogueExpanded = false;

  @Output() openThread = new EventEmitter<void>();

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

  handleOpenThread() {
    this.openThread.emit();
  }

  openEditCommentDialogue() {
    this.editCommentDialogueExpanded = !this.editCommentDialogueExpanded;
  }
}
