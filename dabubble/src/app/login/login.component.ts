import { Component, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { AuthLayoutComponent } from '../shared/auth-layout/auth-layout.component';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Auth, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from '@angular/fire/auth';
import { doc, Firestore, updateDoc } from '@angular/fire/firestore';


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
    private auth: Auth,
    private firestore: Firestore,
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

  private async performLogin(): Promise<void> {
    try {
      this.showOverlay = true;
      this.overlayVariant = 'login';
      const { email, password } = this.loginForm.value;
      const cred = await signInWithEmailAndPassword(this.auth, email, password);
      await this.setUserPresenceOnline(cred.user.uid);
      this.router.navigate(['/main']);
    } catch (err) {
      this.showOverlay = false;
      this.loginForm.get('password')?.reset();
      this.loginForm.markAllAsTouched();
      return;
    }
  }

  async loginWithGoogle(): Promise<void> {
    this.showOverlay = true;
    this.overlayVariant = 'login';

    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(this.auth, provider);
      await this.setUserPresenceOnline(cred.user.uid);
      this.router.navigate(['/main']);
    } catch (err) {
      this.showOverlay = false;
      console.error('Google Login fehlgeschlagen:', err);
    }
  }

  async guestLogin(): Promise<void> {
    this.showOverlay = true;
    this.overlayVariant = 'login';

    try {
      const cred = await signInWithEmailAndPassword(this.auth, this.guestEmail, this.guestPassword);
      await this.setUserPresenceOnline(cred.user.uid);
      this.router.navigate(['/main']);
    } catch (err) {
      this.showOverlay = false;
      console.error('Gast-Login fehlgeschlagen', err);
    }
  }

  private async setUserPresenceOnline(uid: string) {
    const userRef = doc(this.firestore, 'users', uid);

    try {
      await updateDoc(userRef, {
        presence: 'online',
        lastSeen: new Date()
      });
    } catch (err) {
      console.error(`Kein User-Dokument für UID ${uid} gefunden!`, err);
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




}