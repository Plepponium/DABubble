import { CommonModule } from '@angular/common';
import { Component, Output, EventEmitter, HostListener, Input, SimpleChanges, OnInit, AfterViewInit, OnChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-logout-overlay',
  imports: [CommonModule, FormsModule],
  templateUrl: './logout-overlay.component.html',
  styleUrl: './logout-overlay.component.scss'
})
export class LogoutOverlayComponent implements OnInit, AfterViewInit, OnChanges {
  @Output() close = new EventEmitter<void>();
  @Output() openUser = new EventEmitter<void>();
  @Output() logout = new EventEmitter<void>();

  @Input() closing = false;
  @Input() resetActive = false;

  showLogoutOverlayResponsive = false;
  private isResponsive = false;
  buttonActive = false;

  /**
  * Lifecycle hook: initializes responsive state based on viewport width.
  */
  ngOnInit() {
    this.isResponsive = window.innerWidth < 880;
  }

  /**
  * Lifecycle hook: handles input property changes.
  * Manages closing animation on mobile and resets button state when requested.
  * @param changes - Object containing changed input properties.
  */
  ngOnChanges(changes: SimpleChanges) {
    if (changes['closing']) {
      if (this.closing && this.isResponsive) {
        this.showLogoutOverlayResponsive = false;
        this.buttonActive = false;
        setTimeout(() => this.close.emit(), 350);
      }
    }

    if (changes['resetActive'] && !this.resetActive) {
      this.buttonActive = false;
    }
  }

  /**
  * Lifecycle hook: triggers slide-in animation for responsive overlay after view initialization.
  * Short delay ensures CSS transitions are applied correctly.
  */
  ngAfterViewInit() {
    setTimeout(() => {
      if (this.isResponsive) {
        this.showLogoutOverlayResponsive = true;
      }
    }, 10);
  }

  /**
  * Handles user profile button click.
  * Marks the button as active and emits the openUser event.
  */
  handleOpenUserProfile() {
    this.buttonActive = true;
    this.openUser.emit();
  }

  /**
  * Handles logout button click and emits the logout event.
  */
  handleLogout() {
    this.logout.emit();
  }
}
