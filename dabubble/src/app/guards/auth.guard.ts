import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth, authState } from '@angular/fire/auth';
import { UserService } from '../../services/user.service';
import { catchError, first, map, of, take } from 'rxjs';


export const authGuard: CanActivateFn = (route, state) => {
  const userService = inject(UserService);
  const auth = inject(Auth);
  const router = inject(Router);
  
//   return userService.getCurrentUser().pipe(
//     take(1),
//     map(user => {
//       if (user) {
//         console.log('AuthGuard: User is authenticated, allowing access.');
//         return true;
//       } else {
//         console.log('AuthGuard: User is not authenticated, redirecting to login.');
//         router.navigate(['/']);
//         return false;
//       }
//     })
//   );

//   return authService.user$.pipe(
// //   return authState(auth).pipe(
//     take(1),
//     map(user => {
//       if (user) {
//         console.log('✅ Benutzer gefunden:', user.uid);
//         return true;
//       }
//       console.log('❌ Kein Benutzer → Login');
//       router.navigate(['/']);
//       return false;
//     })
//   );

  return authState(auth).pipe(
    take(1),
    map(user => {
      if (user) return true;
      router.navigate(['/']);
      return false;
    })
  );
};

export const redirectIfNotLoggedIn: CanActivateFn = (route, state) => {
  const userService = inject(UserService);
  const router = inject(Router);
  
  return userService.getCurrentUser().pipe(
    take(1),
    map(user => {
      if (user) return true;
      router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
      return false;
    })
  );
};