import { inject, Injectable } from '@angular/core';
import { Auth, authState, signOut } from '@angular/fire/auth';
import { Firestore, collectionData, collection, serverTimestamp } from '@angular/fire/firestore';
import { doc, docData, updateDoc } from '@angular/fire/firestore';
import { Observable, switchMap, of, shareReplay, merge, map, forkJoin, tap, take } from 'rxjs';
import { User } from '../models/user.class';

// import { tap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class UserService {
  auth = inject(Auth);
  firestore = inject(Firestore);

  async updateUser(userId: string, data: Partial<User>): Promise<void> {
    const userRef = doc(this.firestore, `users/${userId}`);
    return updateDoc(userRef, data);
  }

  getCurrentUser(): Observable<User | undefined> {
    return authState(this.auth).pipe(
      switchMap(userAuth => {
        if (!userAuth) return of(undefined);
        return this.getSingleUserById(userAuth.uid);
      }),
      shareReplay(1)
    );
  }

  getUsers(): Observable<User[]> {
    const usersCollection = collection(this.firestore, 'users');
    return collectionData(usersCollection, { idField: 'uid' }) as Observable<User[]>;
  }

  getUsersByIds(uids: string[]): Observable<User[]> {
    if (uids.length === 0) {
      return of([]);
    }
    const observables = uids.map(uid => {
      const userDocRef = doc(this.firestore, `users/${uid}`);
      return docData(userDocRef, { idField: 'uid' }).pipe(
        take(1), // wichtig für forkJoin
        map(data => {
          if (!data) throw new Error(`Kein Nutzer gefunden mit uid ${uid}`);
          return new User(data);
        })
      );
    });
    
    return forkJoin(observables);
  }

  getSingleUserById(userId: string): Observable<User | undefined> {
    const userRef = doc(this.firestore, `users/${userId}`);
    return docData(userRef, { idField: 'uid' }) as Observable<User | undefined>;
  }

  async logout(): Promise<void> {
    const user = this.auth.currentUser;
    if (user) {
      const userRef = doc(this.firestore, 'users', user.uid);
      await updateDoc(userRef, {
        lastSeen: serverTimestamp(),
        presence: 'offline'
      });
    }
    await signOut(this.auth);
  }
}