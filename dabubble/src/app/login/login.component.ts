import { Component, inject, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { AuthLayoutComponent } from '../shared/auth-layout/auth-layout.component';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Auth, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from '@angular/fire/auth';
import { doc, Firestore, getDoc, serverTimestamp, setDoc, updateDoc } from '@angular/fire/firestore';

@Component({
  selector: 'app-login',
  imports: [
    MatCardModule,
    MatFormFieldModule,
    MatButtonModule,
    MatInputModule,
    AuthLayoutComponent,
    RouterLink,
    ReactiveFormsModule
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent implements OnInit {

  showIntro = true;
  submitted = false;
  showOverlay = false;
  overlayVariant: 'login' | 'created' | 'sent' = 'login';

  googleAuthProvider = new GoogleAuthProvider();
  auth = inject(Auth);

  loginForm: FormGroup;

  private guestEmail = 'guest@dabubble.de';
  private guestPassword = 'guest123';

  constructor(
    private fb: FormBuilder,
    private router: Router,
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
    this.loginWithEmail();
  }

  async loginWithEmail(): Promise<void> {
    const { email, password } = this.loginForm.value;
    await this.login(() => signInWithEmailAndPassword(this.auth, email, password));
  }

  async loginWithGoogle(): Promise<void> {
    await this.login(() => signInWithPopup(this.auth, this.googleAuthProvider), true);
  }

  async loginAsGuest(): Promise<void> {
    await this.login(() => signInWithEmailAndPassword(this.auth, this.guestEmail, this.guestPassword));
  }

  private async login(fn: () => Promise<any>, checkDoc = false): Promise<void> {
    this.showOverlay = true;
    try {
      const cred = await fn();
      if (checkDoc) {
        await this.ensureUserDocument(cred.user);
      }
      await this.setUserPresenceOnline(cred.user.uid);
      setTimeout(() => {
        this.router.navigate(['/main']);
      }, 1500);
    } catch (err) {
      this.showOverlay = false;
      this.loginForm.markAllAsTouched();
      this.loginForm.get('password')?.reset();
      console.error('Login fehlgeschlagen:', err);
    }
  }

  private async ensureUserDocument(user: any): Promise<void> {
    const userRef = doc(this.firestore, 'users', user.uid);
    const snap = await getDoc(userRef);

    if (!snap.exists()) {
      await setDoc(userRef, {
        name: user.displayName ?? 'Unbekannter Nutzer',
        email: user.email,
        img: 'default-user',
        createdAt: serverTimestamp(),
        lastSeen: serverTimestamp(),
        presence: 'offline'
      });
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
