import { Component, Output, EventEmitter, inject } from '@angular/core';
import { RoundBtnComponent } from '../round-btn/round-btn.component';
import { ChannelService } from '../../services/channel.service';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../services/user.service';

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
  currentUser: string = '';
  userService = inject(UserService)
  // currentUser$ = this.userService.currentUser$;

  constructor(private channelService: ChannelService) {
    this.userService.currentUser$.subscribe(user => {
      this.currentUser = user?.uid || '';
    });
  }

  handleClose() {
    this.close.emit();
  }

  addChannel() {
    const newChannel = {
      name: this.channelName,
      description: this.description,
      user: this.currentUser, 
      // createdAt: new Date() // Optional
    };
    this.channelService.addChannel(newChannel).then(() => {
      this.handleClose();
    });
  }

}
