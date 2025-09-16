import { Component, Input } from '@angular/core';
import { RoundBtnComponent } from '../round-btn/round-btn.component';
import { DialogueOverlayComponent } from '../dialogue-overlay/dialogue-overlay.component';

@Component({
  selector: 'app-direct-message-chats',
  imports: [RoundBtnComponent, DialogueOverlayComponent],
  templateUrl: './direct-message-chats.component.html',
  styleUrl: './direct-message-chats.component.scss'
})
export class DirectMessageChatsComponent {
  @Input() userId!: string;
}
