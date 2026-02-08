import { CommonModule } from '@angular/common';
import { Component, inject, Input, SimpleChanges } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { Router, RouterLink } from '@angular/router';
import { SignupDraftService } from '../../../services/signup-draft.service';

@Component({
  selector: 'app-auth-layout',
  imports: [MatCardModule, RouterLink, CommonModule],
  templateUrl: './auth-layout.component.html',
  styleUrl: './auth-layout.component.scss'
})

export class AuthLayoutComponent {
  @Input() variant: 'default' | 'privacy' | 'imprint' | 'avatar' = 'default';
  @Input() hideLegalLinks: boolean = false;
  @Input() showRegister: boolean = false;
  @Input() showIntro: boolean = false;
  @Input() showOverlay = false;
  @Input() overlayVariant: 'login' | 'created' | 'sent' | 'changed' = 'login';

  private router = inject(Router)
  private draftService = inject(SignupDraftService)
  private introTimeout: any;

  /**
  * Handles changes to showIntro input by updating scroll lock and starting timer.
  * @param changes - SimpleChanges object containing changed inputs.
  */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['showIntro']) {
      this.updateIntroScrollLock();
      this.startIntroTimer();
    }
  }

  /**
  * Adds or removes 'intro-active' class from document and body based on showIntro state.
  */
  private updateIntroScrollLock(): void {
    const elements = [document.documentElement, document.body];
    if (this.showIntro) {
      elements.forEach(el => el.classList.add('intro-active'));
    } else {
      elements.forEach(el => el.classList.remove('intro-active'));
    }
  }

  /**
  * Starts intro timer with mobile/desktop duration; clears existing timeout.
  */
  private startIntroTimer(): void {
    if (this.showIntro && !this.introTimeout) {
      this.introTimeout = setTimeout(() => {
        this.showIntro = false;
        this.updateIntroScrollLock();
      }, this.getIntroDuration());
    }
  }

  /**
  * Calculates intro duration based on screen width (3500ms mobile, 5000ms desktop).
  * @returns Duration in milliseconds.
  */
  private getIntroDuration(): number {
    const isMobile = window.innerWidth <= 500;
    return isMobile ? 3500 : 5000;
  }

  /**
  * Handles logo click by clearing signup draft if needed and navigating to home.
  */
  onLogoClick(): void {
    this.clearDraftIfSignupRoute();
    this.router.navigate(['/']);
  }

  /**
  * Checks if current route is signup and clears draft service if true.
  */
  private clearDraftIfSignupRoute(): void {
    const currentUrl = this.router.url;
    if (currentUrl.startsWith('/signup')) {
      this.draftService.clear();
    }
  }
}
