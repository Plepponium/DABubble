import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {MatInputModule} from '@angular/material/input';
import {MatFormFieldModule} from '@angular/material/form-field';
import {FormsModule} from '@angular/forms';
import { RoundBtnComponent } from '../round-btn/round-btn.component';

@Component({
  selector: 'app-chats',
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatIconModule, MatButtonModule, RoundBtnComponent],
  templateUrl: './chats.component.html',
  styleUrl: './chats.component.scss'
})
export class ChatsComponent {
  value = 'Clear me';
  threadOpen = true;
  editCommentDialogueExpanded = false;

  @Output() openThread = new EventEmitter<void>();

  handleOpenThread() {
    this.openThread.emit();
  }
  // openThread() {
  //   this.threadOpen = true;
  // }

  openEditCommentDialogue() {
    this.editCommentDialogueExpanded = !this.editCommentDialogueExpanded;
  }
}
