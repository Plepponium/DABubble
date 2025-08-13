import { Component } from '@angular/core';
import { RoundBtnComponent } from '../round-btn/round-btn.component';

@Component({
  selector: 'app-dialogue-overlay',
  imports: [RoundBtnComponent],
  templateUrl: './dialogue-overlay.component.html',
  styleUrl: './dialogue-overlay.component.scss'
})
export class DialogueOverlayComponent {

  closeDialogue() {}
}
