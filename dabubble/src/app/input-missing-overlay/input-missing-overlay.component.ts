import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-input-missing-overlay',
  imports: [],
  templateUrl: './input-missing-overlay.component.html',
  styleUrl: './input-missing-overlay.component.scss'
})
export class InputMissingOverlayComponent {
  @Input() missingInfo!: { recipientMissing: boolean; textMissing: boolean };
  @Output() close = new EventEmitter<void>();

  handleClose() {
    this.close.emit();
  }

  get message(): string {
    if (this.missingInfo.recipientMissing && this.missingInfo.textMissing) {
      return 'Bitte Empfänger und Nachricht eingeben.';
    }
    if (this.missingInfo.recipientMissing) {
      return 'Bitte Empfänger eingeben.';
    }
    return 'Bitte Nachricht eingeben.';
  }
}
