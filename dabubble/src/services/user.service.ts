import { inject, Injectable } from '@angular/core';
import { Auth, authState, signOut } from '@angular/fire/auth';
import { Firestore, collectionData, collection, doc, docData, updateDoc, serverTimestamp, query, where } from '@angular/fire/firestore';
import { Observable, switchMap, of, shareReplay, merge, map, forkJoin } from 'rxjs';
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

  // getUsersByIds(uids: string[]): Observable<User[]> {
  //   if (uids.length === 0) {
  //     return of([]); // Leeres Array wenn keine IDs
  //   }
  //   const usersCollection = collection(this.firestore, 'users');
  //   const q = query(usersCollection, where('uid', 'in', uids));
  //   console.log('getUsersByIds uids', uids);
  //   console.log('getUsersByIds usersCollection', usersCollection);
  //   return collectionData(q, { idField: 'uid' }) as Observable<User[]>;
  // }
  getUsersByIds(uids: string[]): Observable<User[]> {
    if (uids.length === 0) {
      return of([]);
    }

    console.log('getUsersByIds uids:', uids);

    const chunkSize = 10;
    const chunks = [];
    for (let i = 0; i < uids.length; i += chunkSize) {
      chunks.push(uids.slice(i, i + chunkSize));
    }

    const observables = chunks.map(chunk => {
      const usersCollection = collection(this.firestore, 'users');
      const q = query(usersCollection, where('uid', 'in', chunk));
      return collectionData(q, { idField: 'uid' }) as Observable<User[]>;
    });

    return forkJoin(observables).pipe(
      map(results => results.flat())
    );

    // Wenn mehr als 10 IDs, in mehrere Teile splitten oder entsprechend anders abfragen
    // if (uids.length > 10) {
    //   const chunks = [];
    //   for (let i = 0; i < uids.length; i += 10) {
        
    //     const chunk = uids.slice(i, i + 10);
    //     chunks.push(chunk);
    //   }
    //   return merge(...chunks.map(chunk => {
    //     const usersCollection = collection(this.firestore, 'users');
    //     // console.log('getUsersByIds uids:', uids);
    //     const q = query(usersCollection, where('uid', 'in', chunk));
    //     return collectionData(q, { idField: 'uid' }) as Observable<User[]>;
    //   })).pipe(
    //     map(arrays => arrays.flat())
    //   );
    // } else {
    //   const usersCollection = collection(this.firestore, 'users');
    //   const q = query(usersCollection, where('uid', 'in', uids));
    //   return collectionData(q, { idField: 'uid' }) as Observable<User[]>;
    // }
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