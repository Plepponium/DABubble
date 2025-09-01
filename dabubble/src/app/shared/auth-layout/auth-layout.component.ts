import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
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
  @Input() variant: 'default' | 'privacy' | 'imprint' = 'default';
  @Input() hideLegalLinks: boolean = false;
  @Input() showRegister: boolean = false;
  @Input() showIntro: boolean = false;
  @Input() showOverlay = false;
  @Input() overlayVariant: 'login' | 'created' | 'sent' | 'changed' = 'login';

  constructor(
    private router: Router,
    private draftService: SignupDraftService,
  ) { }

  onLogoClick(): void {
    this.clearDraftIfSignupRoute();
    this.router.navigate(['/']);
  }

  private clearDraftIfSignupRoute(): void {
    const currentUrl = this.router.url;
    if (currentUrl.startsWith('/signup')) {
      this.draftService.clear();
    }
  }
}
