import { Component, Output, EventEmitter } from '@angular/core';
import { RoundBtnComponent } from '../round-btn/round-btn.component';
import { ChannelService } from '../../services/channel.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-add-channel-overlay',
  imports: [RoundBtnComponent, FormsModule],
  templateUrl: './add-channel-overlay.component.html',
  styleUrl: './add-channel-overlay.component.scss'
})
export class AddChannelOverlayComponent {
  // @Input() isOpen = false;              // wird von außen gesetzt
  @Output() close = new EventEmitter<void>();

  channelName: string = '';
  description: string = '';

  constructor(private channelService: ChannelService) {}

  handleClose() {
    this.close.emit();
  }

  addChannel() {
    // Passe ggf. die Werte an dein Channel-Model an
    const newChannel = {
      name: this.channelName,
      description: this.description,
      user: 'aktuellerUser', // Optional, falls du User-Daten pflegen willst
      // createdAt: new Date() // Optional
    };
    this.channelService.addChannel(newChannel).then(() => {
      this.handleClose();
    });
  }
}
