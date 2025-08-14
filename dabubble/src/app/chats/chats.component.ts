import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {MatInputModule} from '@angular/material/input';
import {MatFormFieldModule} from '@angular/material/form-field';
import {FormsModule} from '@angular/forms';
import { RoundBtnComponent } from '../round-btn/round-btn.component';
import { DialogueOverlayComponent } from '../dialogue-overlay/dialogue-overlay.component';

@Component({
  selector: 'app-chats',
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatIconModule, MatButtonModule, RoundBtnComponent, DialogueOverlayComponent],
  templateUrl: './chats.component.html',
  styleUrl: './chats.component.scss'
})
export class ChatsComponent {
  value = 'Clear me';
  showUserDialogue = false;
  editCommentDialogueExpanded = false;

  @Output() openThread = new EventEmitter<void>();
  @Output() openBackdrop = new EventEmitter<void>();
  @Output() closeBackdrop = new EventEmitter<void>();

  openDialogueShowUser() {
    this.openBackdrop.emit();
    this.showUserDialogue = true;
  }

  closeDialogueShowUser() {
    this.showUserDialogue = false;
    this.closeBackdrop.emit();
  }

  handleOpenThread() {
    this.openThread.emit();
  }

  openEditCommentDialogue() {
    this.editCommentDialogueExpanded = !this.editCommentDialogueExpanded;
  }
}
