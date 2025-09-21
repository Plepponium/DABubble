import { Component, inject, Input, SimpleChanges } from '@angular/core';
import { RoundBtnComponent } from '../round-btn/round-btn.component';
import { User } from '../../models/user.class';
import { UserService } from '../../services/user.service';
import { CommonModule } from '@angular/common';
import { firstValueFrom, Observable, of } from 'rxjs';
import { DirectMessageService } from '../../services/direct-messages.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-direct-message-chats',
  imports: [RoundBtnComponent, CommonModule, FormsModule],
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
    }
  }

  isSelf(): boolean {
    return !!this.user && !!this.currentUser && this.user.uid === this.currentUser.uid;
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
  }
}