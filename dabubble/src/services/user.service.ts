import { inject, Injectable } from '@angular/core';
import { Auth, authState, signOut } from '@angular/fire/auth';
import { Firestore, collectionData, collection, doc, docData, updateDoc, serverTimestamp, query, where } from '@angular/fire/firestore';
import { Observable, switchMap, of, shareReplay } from 'rxjs';
import { User } from '../models/user.class';

@Injectable({ providedIn: 'root' })
export class UserService {
  private auth = inject(Auth);
  private firestore = inject(Firestore);

  public currentUser$: Observable<User | undefined> =
    authState(this.auth).pipe(
      switchMap(userAuth => {
        if (!userAuth) return of(undefined);
        const userRef = doc(this.firestore, 'users', userAuth.uid);
        return docData(userRef, { idField: 'uid' }) as Observable<User>;
      }),
      shareReplay(1)
    );


  getUsers(): Observable<User[]> {
    const usersCollection = collection(this.firestore, 'users');
    return collectionData(usersCollection, { idField: 'uid' }) as Observable<User[]>;
  }

  getUsersByIds(uids: string[]): Observable<User[]> {
    if (uids.length === 0) {
      return of([]); // Leeres Array wenn keine IDs
    }
    const usersCollection = collection(this.firestore, 'users');
    const q = query(usersCollection, where('uid', 'in', uids));
    return collectionData(q, { idField: 'uid' }) as Observable<User[]>;
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