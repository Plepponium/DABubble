import { Injectable } from '@angular/core';
import { Firestore, collectionData, collection } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

export interface User {
  id: string;
  name: string;
  email: string;
  img: string;
  lastSeen: string;
  presence: string;
  online: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  constructor(private firestore: Firestore) {}

  // getUsers(): Observable<User[]> {
  //   return this.firestore.collection<User>('users').valueChanges({idField:'id'});
  // }
  getUsers(): Observable<User[]> {
    const usersCollection = collection(this.firestore, 'users');
    return collectionData(usersCollection, { idField: 'id' }) as Observable<User[]>;
  }
}