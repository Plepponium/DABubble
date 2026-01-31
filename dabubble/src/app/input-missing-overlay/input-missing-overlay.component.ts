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

  /**
  * Emits the close event to signal that the current dialog or component should be closed.
  */
  handleClose() {
    this.close.emit();
  }

  /**
  * Returns a message indicating which required information is missing.
  * Displays different hints based on whether the recipient and/or message text are missing.
  * @returns {string} A localized hint string for the user prompting required input.
  */
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
