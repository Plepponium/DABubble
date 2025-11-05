import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-round-btn',
  imports: [],
  templateUrl: './round-btn.component.html',
  styleUrl: './round-btn.component.scss'
})
export class RoundBtnComponent {
  @Input() iconSrc = '';          // normal Icon
  @Input() iconHoverSrc = '';     // Hover Icon
  @Input() altText = '';   
  
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
}
