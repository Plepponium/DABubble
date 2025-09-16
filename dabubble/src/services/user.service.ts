import { inject, Injectable } from '@angular/core';
import { Auth, authState, signOut } from '@angular/fire/auth';
import { Firestore, collectionData, collection, doc, docData, updateDoc, serverTimestamp, query, where, DocumentData } from '@angular/fire/firestore';
import { Observable, switchMap, of, shareReplay, merge, map, forkJoin, tap, take } from 'rxjs';
import { User } from '../models/user.class';
// import { tap } from 'rxjs/operators';

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
      return of([]);
    }

    // Für jede uid wird eine eigene Query als Observable erzeugt
    const observables = uids.map(uid => {
      const userDocRef = doc(this.firestore, `users/${uid}`);
      return docData(userDocRef, { idField: 'uid' }).pipe(
        take(1), // wichtig für forkJoin
        map(data => {
          if (!data) throw new Error(`Kein Nutzer gefunden mit uid ${uid}`);
          // console.log('getUsersByIds data:', data);
          return new User(data);
        })
      );
    });

    // Zusammensetzen aller Observables zu einem, das alle User als Array liefert
    return forkJoin(observables);
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