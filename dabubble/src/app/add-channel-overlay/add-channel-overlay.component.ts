import { Component, Output, EventEmitter } from '@angular/core';
import { RoundBtnComponent } from '../round-btn/round-btn.component';

@Component({
  selector: 'app-add-channel-overlay',
  imports: [RoundBtnComponent],
  templateUrl: './add-channel-overlay.component.html',
  styleUrl: './add-channel-overlay.component.scss'
})
export class AddChannelOverlayComponent {
  // @Input() isOpen = false;              // wird von außen gesetzt
  @Output() close = new EventEmitter<void>();

  handleClose() {
    this.close.emit();
  }
}
