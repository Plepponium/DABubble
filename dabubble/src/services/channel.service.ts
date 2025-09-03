import { inject, Injectable } from '@angular/core';
import { Firestore, collectionData, collection } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Channel } from '../models/channel.class';

@Injectable({ providedIn: 'root' })
export class ChannelService {
  private firestore = inject(Firestore);

  constructor() { }

  getChannels(): Observable<Channel[]> {
    const channelsCollection = collection(this.firestore, 'channels');
    return collectionData(channelsCollection, { idField: 'id' }) as Observable<Channel[]>;
  }
}