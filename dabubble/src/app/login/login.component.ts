import { Component, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { AuthLayoutComponent } from '../shared/auth-layout/auth-layout.component';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';


@Component({
  selector: 'app-login',
  imports: [MatCardModule, MatFormFieldModule, MatButtonModule, MatInputModule, AuthLayoutComponent, RouterLink, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})

export class LoginComponent implements OnInit {
  showIntro = true;
  loginForm: FormGroup;
  submitted = false;
  showOverlay = false;
  overlayVariant: 'login' | 'created' | 'sent' = 'login';

  constructor(private fb: FormBuilder, private router: Router) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)]],
      password: ['', [Validators.required,]]
    });
  }

  ngOnInit() {
    const alreadyShown = localStorage.getItem('introShown');

    if (!alreadyShown) {
      this.showIntro = true;
      localStorage.setItem('introShown', 'true');
    } else {
      this.showIntro = false;
    }
  }

  get email() {
    return this.loginForm.get('email');
  }

  get password() {
    return this.loginForm.get('password');
  }

  onSubmit(): void {
    this.submitted = true;
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }
    this.login();
  }

  login() {
    this.overlayVariant = 'login';
    this.showOverlay = true;

    setTimeout(() => {
      this.showOverlay = false;
      this.router.navigate(['/main']);
    }, 1500);
  }

}
