import { Component } from '@angular/core';
import { AuthLayoutComponent } from '../shared/auth-layout/auth-layout.component';
import { MatCardModule } from '@angular/material/card';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { User } from '../../models/user.class';
import { SignupDraftService } from '../../services/signup-draft.service';

@Component({
  selector: 'app-signup',
  imports: [AuthLayoutComponent, MatCardModule, RouterLink, ReactiveFormsModule],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.scss'
})
export class SignupComponent {
  signupForm: FormGroup;
  submitted = false;
  user = new User();

  constructor(private fb: FormBuilder, private router: Router, private draftService: SignupDraftService) {
    this.signupForm = this.fb.group({
      name: ['', [Validators.required, Validators.pattern(/^[A-Za-zÄÖÜäöüß'-]+\s+[A-Za-zÄÖÜäöüß'-]+$/),]],
      email: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9ÄÖÜäöüß._%+-]+@[A-Za-z0-9ÄÖÜäöüß.-]+\.[A-Za-z]{2,}$/)]],
      password: ['', [Validators.required,]],
      agree: [false, Validators.requiredTrue],
    });
  }

  get name() { return this.signupForm.get('name'); }
  get email() { return this.signupForm.get('email'); }
  get password() { return this.signupForm.get('password'); }
  get agree() { return this.signupForm.get('agree'); }

  onSubmit(): void {
    this.submitted = true;
    if (this.signupForm.invalid) {
      this.signupForm.markAllAsTouched();
      return;
    }
    this.user = new User(this.signupForm.value);
    this.draftService.setDraft(this.user);
    this.router.navigate(['/signup/avatar']);
  }

}