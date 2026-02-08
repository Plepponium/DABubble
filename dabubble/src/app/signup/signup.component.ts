import { Component, inject } from '@angular/core';
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
  signupForm!: FormGroup;
  submitted = false;
  user = new User();

  private fb = inject(FormBuilder);
  private router = inject(Router);
  private draftService = inject(SignupDraftService);

  /**
  * Initializes the signup form on component initialization with validation rules for name, email, password, and terms agreement.
  */
  ngOnInit(): void {
    this.initSignupForm();
  }

  /**
  * Convenience getters for easy access to form fields in the template, allowing for validation and error display.
  */
  get name() { return this.signupForm.get('name'); }
  get email() { return this.signupForm.get('email'); }
  get password() { return this.signupForm.get('password'); }
  get agree() { return this.signupForm.get('agree'); }

  /**
  * Initializes the signup form with validation rules for name, email, password, and terms agreement.
  */
  private initSignupForm(): void {
    this.signupForm = this.fb.group({
      name: ['', [Validators.required, Validators.pattern(/^[A-Za-zÄÖÜäöüß'-]+\s+[A-Za-zÄÖÜäöüß'-]+$/),]],
      email: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9ÄÖÜäöüß._%+-]+@[A-Za-z0-9ÄÖÜäöüß.-]+\.[A-Za-z]{2,}$/)]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      agree: [false, Validators.requiredTrue],
    });
  }

  /**
  * Handles form submission: marks fields as touched, creates User from form data,
  * saves draft, and navigates to avatar step if valid.
  */
  onSubmit(): void {
    this.submitted = true;
    if (this.signupForm.invalid) {
      this.signupForm.markAllAsTouched();
      return;
    }
    this.processValidForm();
  }

  /**
  * Processes valid form: creates User instance, saves draft, navigates to avatar step.
  */
  private processValidForm(): void {
    this.user = new User(this.signupForm.value);
    this.draftService.setDraft(this.user);
    this.router.navigate(['/signup/avatar']);
  }

}