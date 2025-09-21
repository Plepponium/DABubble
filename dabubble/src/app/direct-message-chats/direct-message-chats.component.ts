import { Component, inject, Input, SimpleChanges } from '@angular/core';
import { RoundBtnComponent } from '../round-btn/round-btn.component';
import { User } from '../../models/user.class';
import { UserService } from '../../services/user.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-direct-message-chats',
  imports: [RoundBtnComponent, CommonModule],
  templateUrl: './direct-message-chats.component.html',
  styleUrl: './direct-message-chats.component.scss'
})
export class DirectMessageChatsComponent {
  @Input() userId!: string;
  user?: User;
  currentUser?: User;

  userService = inject(UserService);

  ngOnInit() {
    this.userService.getCurrentUser().subscribe(current => {
      this.currentUser = current;
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['userId'] && this.userId) {
      this.userService.getSingleUserById(this.userId).subscribe(user => {
        this.user = user;
      });
    }
  }

  isSelf(): boolean {
    return this.user?.uid === this.currentUser?.uid;
  }
}
