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

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['showIntro']) {
      this.updateIntroScrollLock();
      this.startIntroTimer();
    }
  }

  private updateIntroScrollLock() {
    if (this.showIntro) {
      document.documentElement.classList.add('intro-active');
      document.body.classList.add('intro-active');
    } else {
      document.documentElement.classList.remove('intro-active');
      document.body.classList.remove('intro-active');
    }
  }

  private startIntroTimer(): void {
    if (this.showIntro && !this.introTimeout) {
      const isMobile = window.innerWidth <= 500;
      const duration = isMobile ? 3500 : 5000;
      console.log(`Intro-Timer gestartet: ${duration}ms (${isMobile ? 'mobil' : 'desktop'})`);

      this.introTimeout = setTimeout(() => {
        this.showIntro = false;
        this.updateIntroScrollLock();
      }, duration);
    }
  }

  onLogoClick(): void {
    this.clearDraftIfSignupRoute();
    this.router.navigate(['/']);
  }

  private clearDraftIfSignupRoute(): void {
    const currentUrl = this.router.url;
    console.log(currentUrl);

    if (currentUrl.startsWith('/signup')) {
      this.draftService.clear();
    }
  }
}
