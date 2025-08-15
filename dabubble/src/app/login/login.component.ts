import { Component, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { AuthLayoutComponent } from '../shared/auth-layout/auth-layout.component';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Auth, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from '@angular/fire/auth';


@Component({
  selector: 'app-login',
  imports: [MatCardModule, MatFormFieldModule, MatButtonModule, MatInputModule, AuthLayoutComponent, RouterLink, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})

export class LoginComponent implements OnInit {

  showIntro = true;
  submitted = false;
  showOverlay = false;
  overlayVariant: 'login' | 'created' | 'sent' = 'login';

  loginForm: FormGroup;

  private guestEmail = 'guest@dabubble.de';
  private guestPassword = 'guest123';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private auth: Auth
  ) {
    this.loginForm = this.createForm();
  }

  ngOnInit(): void {
    this.checkIntroAnimation();
  }

  get email() { return this.loginForm.get('email'); }
  get password() { return this.loginForm.get('password'); }

  onSubmit(): void {
    this.submitted = true;
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }
    this.performLogin();
  }

  async guestLogin(): Promise<void> {
    this.showOverlay = true;
    this.overlayVariant = 'login';

    try {
      await signInWithEmailAndPassword(this.auth, this.guestEmail, this.guestPassword);
      this.router.navigate(['/main']);
    } catch (err) {
      this.showOverlay = false;
      console.error('Gast-Login fehlgeschlagen', err);
    }
  }

  private createForm(): FormGroup {
    return this.fb.group({
      email: ['', [
        Validators.required,
        Validators.pattern(/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/)
      ]],
      password: ['', Validators.required]
    });
  }

  private checkIntroAnimation(): void {
    const alreadyShown = localStorage.getItem('introShown');
    this.showIntro = !alreadyShown;
    if (!alreadyShown) {
      localStorage.setItem('introShown', 'true');
    }
  }

  private async performLogin(): Promise<void> {
    this.showOverlay = true;
    this.overlayVariant = 'login';

    try {
      const { email, password } = this.loginForm.value;
      await signInWithEmailAndPassword(this.auth, email, password);
      this.router.navigate(['/main']);
    } catch (err) {
      this.showOverlay = false;
      console.error('Login fehlgeschlagen:', err);
    }
  }

  async loginWithGoogle(): Promise<void> {
    this.showOverlay = true;
    this.overlayVariant = 'login';

    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(this.auth, provider);
      this.router.navigate(['/main']);
    } catch (err) {
      this.showOverlay = false;
      console.error('Google Login fehlgeschlagen:', err);
    }
  }
}