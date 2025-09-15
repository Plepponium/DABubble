import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-direct-message-chats',
  imports: [],
  templateUrl: './direct-message-chats.component.html',
  styleUrl: './direct-message-chats.component.scss'
})
export class DirectMessageChatsComponent {
  @Input() userId!: string;
}
