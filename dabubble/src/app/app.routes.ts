import { Routes } from '@angular/router';
import { MainPageComponent } from './main-page/main-page.component';
import { LoginComponent } from './login/login.component';
import { SignupComponent } from './signup/signup.component';
import { ImprintComponent } from './imprint/imprint.component';
import { PrivacyComponent } from './privacy/privacy.component';
import { SignupAvatarComponent } from './signup-avatar/signup-avatar.component';
import { PwResetComponent } from './pw-reset/pw-reset.component';
import { PwChangeComponent } from './pw-change/pw-change.component';

export const routes: Routes = [
    { path: '', component: LoginComponent, title: 'DABubble | Login' },
    { path: 'main', component: MainPageComponent, title: 'DABubble | Home' },
    { path: 'signup', component: SignupComponent, title: 'DABubble | Sign Up' },
    { path: 'signup/avatar', component: SignupAvatarComponent, title: 'DABubble | Sign Up' },
    { path: 'password/reset', component: PwResetComponent, title: 'DABubble | Reset Password' },
    { path: 'password/change', component: PwChangeComponent, title: 'DABubble | Change Password' },
    { path: 'imprint', component: ImprintComponent, title: 'DABubble | Impressum' },
    { path: 'privacy', component: PrivacyComponent, title: 'DABubble | Datenschutzerklärung' },
];
