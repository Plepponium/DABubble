import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { RoundBtnComponent } from '../round-btn/round-btn.component';
import { Channel } from '../../models/channel.class';
import { ChannelService } from '../../services/channel.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-channel-description-overlay',
  imports: [RoundBtnComponent, CommonModule, FormsModule],
  templateUrl: './channel-description-overlay.component.html',
  styleUrl: './channel-description-overlay.component.scss'
})
export class ChannelDescriptionOverlayComponent {
  @Input() channelId?: string;
  @Output() close = new EventEmitter<void>();

  channel?: Channel;
  channelService = inject(ChannelService);

  isEditingName = false;
  isEditingDescription = false;

  ngOnInit() {
    if (this.channelId) {
      this.channelService.getChannelById(this.channelId).subscribe(channel => {
        this.channel = channel;
      });
    }
  }

  handleClose() {
    this.close.emit();
  }

  toggleEditName() {
    this.isEditingName = !this.isEditingName;
  }

  toggleEditDescription() {
    this.isEditingDescription = !this.isEditingDescription;
  }
}
