import { inject, Injectable } from '@angular/core';
import { Auth, authState, signOut } from '@angular/fire/auth';
import { Firestore, collectionData, collection, serverTimestamp } from '@angular/fire/firestore';
import { doc, docData, updateDoc } from '@angular/fire/firestore';
import { Observable, switchMap, of, shareReplay, map, forkJoin, take, combineLatest, Subject, takeUntil, catchError, filter, EMPTY, OperatorFunction } from 'rxjs';
import { User } from '../models/user.class';
import { LogoutService } from './logout.service';

@Injectable({ providedIn: 'root' })
export class UserService {
  auth = inject(Auth);
  firestore = inject(Firestore);
  private logoutService = inject(LogoutService);

  /** Updates user document with partial data. */
  async updateUser(userId: string, data: Partial<User>): Promise<void> {
    const userRef = this.getUserDocRef(userId);
    return updateDoc(userRef, data);
  }

  /** Creates Firestore document reference for user. */
  private getUserDocRef(userId: string): any {
    return doc(this.firestore, `users/${userId}`);
  }

  /** Streams current authenticated user with Firestore data. */
  getCurrentUser(): Observable<User | undefined> {
    return authState(this.auth).pipe(
      takeUntil(this.logoutService.logout$),
      this.filterNonNullAuthUser(),
      switchMap(userAuth => this.getUserOrUndefined(userAuth.uid)),
      this.catchErrorsToUndefined(),
      shareReplay(1)
    );
  }

  /** Filters out null/undefined auth users. */
  private filterNonNullAuthUser() {
    return filter((userAuth: any) => userAuth !== null);
  }

  /** Gets user by ID or returns undefined. */
  private getUserOrUndefined(userId: string): Observable<User | undefined> {
    return userId ? this.getSingleUserById(userId) : of(undefined);
  }

  /** Catches errors and returns undefined fallback. */
  private catchErrorsToUndefined(): OperatorFunction<User | undefined, User | undefined> {
    return catchError(() => of(undefined));
  }

  /** Streams single user document by ID. */
  getSingleUserById(userId: string): Observable<User | undefined> {
    if (!userId) return of(undefined);
    const userRef = this.getUserDocRef(userId);
    return docData(userRef, { idField: 'uid' }).pipe(
      map(data => (data as User | undefined)),
      this.catchErrorsToUndefined()
    );
  }

  /** Streams all users from collection. */
  getUsers(): Observable<User[]> {
    const usersCollection = collection(this.firestore, 'users');
    return collectionData(usersCollection, { idField: 'uid' }).pipe(
      map((data: any[]) => data as User[]),
      this.catchErrorsToEmptyArray()
    );
  }

  /** Catches errors and returns empty array fallback. */
  private catchErrorsToEmptyArray(): OperatorFunction<User[], User[]> {
    return catchError(() => of([] as User[]));
  }

  /** Streams users by array of IDs. */
  getUsersByIds(uids: string[]): Observable<User[]> {
    if (uids.length === 0) return of([]);
    const userObservables = uids.map(uid => this.createUserObservable(uid));
    return combineLatest(userObservables).pipe(
      this.catchErrorsToEmptyArray()
    );
  }

  /** Creates observable for single user document. */
  private createUserObservable(uid: string): Observable<User> {
    const userDocRef = this.getUserDocRef(uid);
    return docData(userDocRef, { idField: 'uid' }).pipe(
      map((data: any) => {
        if (!data) throw new Error(`No user found with uid ${uid}`);
        return new User(data);
      }),
      catchError(() => EMPTY)
    );
  }

  /** Performs complete logout with status update. */
  async logout(): Promise<void> {
    this.logoutService.triggerLogout();
    await this.delay(300);
    const user = this.auth.currentUser;
    if (user) {
      await this.updateUserPresence(user.uid);
    }
    await signOut(this.auth);
    this.logoutService.complete();
  }

  /** Delays execution by specified milliseconds. */
  private delay(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms));
  }

  /** Updates user presence to offline with timeout. */
  private async updateUserPresence(userId: string): Promise<void> {
    const userRef = this.getUserDocRef(userId);
    const updatePromise = updateDoc(userRef, {
      lastSeen: serverTimestamp(),
      presence: 'offline'
    });
    await Promise.race([
      updatePromise,
      this.createUpdateTimeout(1500)
    ]).catch(() => {
    });
  }

  /** Creates timeout promise for update operations. */
  private createUpdateTimeout(timeoutMs: number): Promise<never> {
    return new Promise((_, reject) => setTimeout(() => reject(new Error('Update timeout')), timeoutMs));
  }

}