import { Component, inject } from '@angular/core';
import { AuthLayoutComponent } from '../shared/auth-layout/auth-layout.component';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { sendPasswordResetEmail } from 'firebase/auth';
import { Auth } from '@angular/fire/auth';

@Component({
  selector: 'app-pw-reset',
  imports: [AuthLayoutComponent, RouterLink, MatCardModule, ReactiveFormsModule],
  templateUrl: './pw-reset.component.html',
  styleUrl: './pw-reset.component.scss'
})
export class PwResetComponent {
  resetForm: FormGroup;
  auth = inject(Auth)
  submitted = false;
  showOverlay = false;
  overlayVariant: 'login' | 'created' | 'sent' | 'changed' = 'sent';

  constructor(private fb: FormBuilder, private router: Router) {
    this.resetForm = this.fb.group({
      email: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)]],
    });
  }

  get email() {
    return this.resetForm.get('email');
  }

  onSubmit(): void {
    this.submitted = true;
    if (this.resetForm.invalid) {
      this.resetForm.markAllAsTouched();
      return;
    }
    this.sendMail();
  }

  async sendMail() {
    this.overlayVariant = 'sent';
    this.showOverlay = true;
    try {
      await sendPasswordResetEmail(this.auth, this.resetForm.value.email, {
        url: 'http://localhost:4200/password/change'
      });
      setTimeout(() => {
        this.showOverlay = false;
        this.router.navigate(['/']);
      }, 1500);
    } catch (error) {
      console.error('Reset-Email fehlgeschlagen:', error);
    }
  }

}