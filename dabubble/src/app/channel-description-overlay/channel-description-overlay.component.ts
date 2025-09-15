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

  editedName = '';
  editedDescription = '';

  ngOnInit() {
    if (this.channelId) {
      this.channelService.getChannelById(this.channelId).subscribe(channel => {
        this.channel = channel;
        this.editedName = channel.name;
        this.editedDescription = channel.description || '';
      });
    }
  }

  handleClose() {
    this.close.emit();
  }

  toggleEditName() {
    if (this.isEditingName && this.channel) {
      if (this.editedName && this.editedName !== this.channel.name) {
        this.channelService.updateChannel(this.channel.id, { name: this.editedName })
          .then(() => {
            this.channel!.name = this.editedName;
          });
      }
    }
    this.isEditingName = !this.isEditingName;
  }

  toggleEditDescription() {
    if (this.isEditingDescription && this.channel) {
      if (this.editedDescription !== this.channel.description) {
        this.channelService.updateChannel(this.channel.id, { description: this.editedDescription })
          .then(() => {
            this.channel!.description = this.editedDescription;
          });
      }
    }
    this.isEditingDescription = !this.isEditingDescription;
  }

  leaveChannel() {
    // participants--
    // if participants === 0 => deleteChannel()
  }

}
