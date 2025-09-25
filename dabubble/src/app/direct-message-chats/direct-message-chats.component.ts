import { Component, ElementRef, ViewChild, inject, Input, SimpleChanges } from '@angular/core';
import { RoundBtnComponent } from '../round-btn/round-btn.component';
import { User } from '../../models/user.class';
import { UserService } from '../../services/user.service';
import { CommonModule } from '@angular/common';
import { firstValueFrom, Observable, of } from 'rxjs';
import { DirectMessageService } from '../../services/direct-messages.service';
import { FormsModule } from '@angular/forms';
import { DmReactionsDialogComponent } from '../dm-reactions-dialog/dm-reactions-dialog.component';

@Component({
  selector: 'app-direct-message-chats',
  imports: [RoundBtnComponent, CommonModule, FormsModule, DmReactionsDialogComponent],
  templateUrl: './direct-message-chats.component.html',
  styleUrl: './direct-message-chats.component.scss'
})
export class DirectMessageChatsComponent {
  @Input() userId!: string;
  dmId?: string;

  user?: User;
  currentUser?: User;
  messages$?: Observable<any[]>;
  messageText = '';

  private userService = inject(UserService);
  private dmService = inject(DirectMessageService);
  reactionIcons: string[] = ['check', 'thumb'];


  async ngOnChanges(changes: SimpleChanges) {
    if (changes['userId'] && this.userId) {
      this.userService.getSingleUserById(this.userId).subscribe(u => this.user = u);
      this.currentUser = await firstValueFrom(this.userService.getCurrentUser());
      if (!this.currentUser) {
        this.messages$ = of([]);
        return;
      }
      this.dmId = await this.dmService.getOrCreateDmId(this.currentUser.uid, this.userId);
      this.messages$ = this.dmService.getMessages(this.dmId);
      this.messages$.subscribe(() => {
        setTimeout(() => this.scrollToBottom(), 0);
      });
    }
  }

  scrollToBottom() {
    const container = document.getElementById("dm-chat-content");
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }

  isSelf(): boolean {
    return this.user?.uid === this.currentUser?.uid;
  }

  isSameDate(d1: Date | undefined, d2: Date | undefined): boolean {
    if (!d1 || !d2) return false;
    return d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate();
  }

  getDisplayDate(date: Date | undefined): string {
    if (!date) return '';

    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (this.isSameDate(date, today)) {
      return 'Heute';
    } else if (this.isSameDate(date, yesterday)) {
      return 'Gestern';
    } else {
      // normales Datum: Montag, 20. September
      return new Intl.DateTimeFormat('de-DE', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      }).format(date);
    }
  }

  async sendMessage() {
    const text = (this.messageText || '').trim();
    if (!text || !this.dmId || !this.currentUser) return;

    await this.dmService.sendMessage(this.dmId, {
      senderId: this.currentUser.uid,
      senderName: this.currentUser.name,
      senderImg: this.currentUser.img,
      text
    });

    this.messageText = '';
    this.scrollToBottom();
  }

  addReaction(index: number, icon: string) {
    console.log("Index: ", index, "Icon: ", icon);

  };
  openReactionsDialogue(index: number) {
    console.log("Index: ", index);
  };
  openEditComment(id: string) {
    console.log("Id: ", id);
  };

}
