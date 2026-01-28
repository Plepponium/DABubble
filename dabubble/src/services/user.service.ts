import { inject, Injectable } from '@angular/core';
import { Auth, authState, signOut } from '@angular/fire/auth';
import { Firestore, collectionData, collection, serverTimestamp } from '@angular/fire/firestore';
import { doc, docData, updateDoc } from '@angular/fire/firestore';
import { Observable, switchMap, of, shareReplay, map, forkJoin, take, combineLatest, Subject, takeUntil, catchError, filter, EMPTY } from 'rxjs';
import { User } from '../models/user.class';
import { LogoutService } from './logout.service';

@Injectable({ providedIn: 'root' })
export class UserService {
  auth = inject(Auth);
  firestore = inject(Firestore);
  private logoutService = inject(LogoutService);

  async updateUser(userId: string, data: Partial<User>): Promise<void> {
    const userRef = doc(this.firestore, `users/${userId}`);
    return updateDoc(userRef, data);
  }

  getCurrentUser(): Observable<User | undefined> {
    return authState(this.auth).pipe(
      takeUntil(this.logoutService.logout$),
      filter(userAuth => userAuth !== null),
      switchMap(userAuth => {
        if (!userAuth) return of(undefined);
        return this.getSingleUserById(userAuth.uid).pipe(
          catchError(error => {
            console.warn('Error reading current user:', error);
            return of(undefined);
          })
        );
      }),
      catchError(() => of(undefined)),
      shareReplay(1)
    );
  }

  getSingleUserById(userId: string): Observable<User | undefined> {
    if (!userId) return of(undefined);
    const userRef = doc(this.firestore, `users/${userId}`);
    return docData(userRef, { idField: 'uid' }).pipe(
      map(data => (data as User | undefined)),
      catchError(() => of(undefined))
    );
  }

  getUsers(): Observable<User[]> {
    const usersCollection = collection(this.firestore, 'users');
    return collectionData(usersCollection, { idField: 'uid' }).pipe(
      map(data => data as User[]),
      catchError(() => of([]))
    );
  }

  getUsersByIds(uids: string[]): Observable<User[]> {
    if (uids.length === 0) return of([]);
    const observables = uids.map(uid => {
      const userDocRef = doc(this.firestore, `users/${uid}`);
      return docData(userDocRef, { idField: 'uid' }).pipe(
        map(data => {
          if (!data) throw new Error(`Kein Nutzer gefunden mit uid ${uid}`);
          return new User(data);
        }),
        catchError(() => EMPTY)
      );
    });
    return combineLatest(observables).pipe(
      catchError(() => of([]))
    );
  }


  async logout(): Promise<void> {
    this.logoutService.triggerLogout();
    await new Promise(r => setTimeout(r, 300));
    const user = this.auth.currentUser;
    if (user) {
      try {
        const userRef = doc(this.firestore, 'users', user.uid);
        const updatePromise = updateDoc(userRef, {
          lastSeen: serverTimestamp(),
          presence: 'offline'
        });
        await Promise.race([
          updatePromise,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Update timeout')), 1500)
          )
        ]).catch(() => {
        });
      } catch (error) {
        console.warn('Could not update user status:', error);
      }
    }
    await signOut(this.auth);
    this.logoutService.complete();
  }

}