import { Routes } from '@angular/router';
import { MainPageComponent } from './main-page/main-page.component';
import { LoginComponent } from './login/login.component';
import { SignupComponent } from './signup/signup.component';
import { ImprintComponent } from './imprint/imprint.component';
import { PrivacyComponent } from './privacy/privacy.component';

export const routes: Routes = [
    { path: '', component: LoginComponent },
    { path: 'main', component: MainPageComponent, },
    { path: 'signup', component: SignupComponent, },
    { path: 'imprint', component: ImprintComponent, },
    { path: 'privacy', component: PrivacyComponent, },

];
